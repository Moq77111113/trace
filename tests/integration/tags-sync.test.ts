import { describe, it, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';
import { syncFeatureTags } from '$lib/server/features/internal/tags-sync';
import { db } from '$lib/server/db/client';
import { tags, featureTags } from '$lib/server/db/schema';

describe('syncFeatureTags', () => {
  it('upserts new tags and links them', async () => {
    const p = await mkProject({ name: `Tag ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'F' });
    await db.transaction((tx) => syncFeatureTags(tx, { projectId: p.id, featureId: f.id, parsedTags: ['smoke', 'auth'] }));

    const links = await db.query.featureTags.findMany({ where: eq(featureTags.featureId, f.id) });
    expect(links.length).toBe(2);
  });

  it('removes links no longer present and GCs orphans', async () => {
    const p = await mkProject({ name: `Tag2 ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'F' });
    await db.transaction((tx) => syncFeatureTags(tx, { projectId: p.id, featureId: f.id, parsedTags: ['x', 'y'] }));
    await db.transaction((tx) => syncFeatureTags(tx, { projectId: p.id, featureId: f.id, parsedTags: ['x'] }));

    const remaining = await db.query.tags.findMany({
      where: and(eq(tags.projectId, p.id), eq(tags.name, 'y')),
    });
    expect(remaining.length).toBe(0);
  });

  it("doesn't GC a tag still referenced by another feature", async () => {
    const p  = await mkProject({ name: `Tag3 ${Date.now()}` });
    const f1 = await createFeature({ projectId: p.id, name: 'F1' });
    const f2 = await createFeature({ projectId: p.id, name: 'F2' });
    await db.transaction((tx) => syncFeatureTags(tx, { projectId: p.id, featureId: f1.id, parsedTags: ['shared'] }));
    await db.transaction((tx) => syncFeatureTags(tx, { projectId: p.id, featureId: f2.id, parsedTags: ['shared'] }));
    await db.transaction((tx) => syncFeatureTags(tx, { projectId: p.id, featureId: f1.id, parsedTags: [] }));

    const remaining = await db.query.tags.findMany({
      where: and(eq(tags.projectId, p.id), eq(tags.name, 'shared')),
    });
    expect(remaining.length).toBe(1);
  });
});
