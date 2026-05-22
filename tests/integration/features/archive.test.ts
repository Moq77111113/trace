import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { mkProject } from '$testing/fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';
import { archiveFeature } from '$lib/server/features/lifecycle/archive';
import { listFeatures } from '$lib/server/features/read/queries';

describe('archiveFeature', () => {
  it('sets archived=true and hides the row from listFeatures', async () => {
    const p = await mkProject({ name: `Arc ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'Doomed' });

    expect((await listFeatures(p.id)).length).toBe(1);

    const result = await archiveFeature(f.id);
    expect(result.ok).toBe(true);

    const row = await db.query.features.findFirst({ where: eq(features.id, f.id) });
    expect(row?.archived).toBe(true);
    expect((await listFeatures(p.id)).length).toBe(0);
  });

  it('returns not-found for missing features', async () => {
    const result = await archiveFeature('00000000-0000-7000-8000-000000000000');
    expect(result).toEqual({ ok: false, error: 'not-found' });
  });

  it('keeps the row in the DB so run history references stay intact', async () => {
    const p = await mkProject({ name: `Keep ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'Survivor' });

    await archiveFeature(f.id);

    const row = await db.query.features.findFirst({ where: eq(features.id, f.id) });
    expect(row).not.toBeUndefined();
    expect(row?.name).toBe('Survivor');
  });
});
