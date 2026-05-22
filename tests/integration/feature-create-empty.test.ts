import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { mkProject } from '$testing/fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';

describe('createFeature with empty content', () => {
  it('creates a feature with empty content and null description', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'POI creation' });
    const [row] = await db.select().from(features).where(eq(features.id, f.id));
    if (!row) throw new Error('feature row not found');
    expect(row.content).toBe('');
    expect(row.description).toBeNull();
    expect(row.name).toBe('POI creation');
    expect(row.parseErrors).toBeNull();
  });
});
