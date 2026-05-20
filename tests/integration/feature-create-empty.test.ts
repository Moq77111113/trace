import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/create';

describe('createFeature with empty content', () => {
  it('creates a feature with null content and null description', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'POI creation' });
    const [row] = await db.select().from(features).where(eq(features.id, f.id));
    expect(row.content).toBeNull();
    expect(row.description).toBeNull();
    expect(row.name).toBe('POI creation');
    expect(row.parseErrors).toBeNull();
  });
});
