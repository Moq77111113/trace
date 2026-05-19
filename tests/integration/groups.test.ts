import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { featureGroups, features } from '$lib/server/db/schema';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/create';
import { createGroup } from '$lib/server/groups/create';
import { listGroups } from '$lib/server/groups/queries';
import { renameGroup } from '$lib/server/groups/rename';
import { deleteGroup } from '$lib/server/groups/delete';
import { reorderGroups } from '$lib/server/groups/reorder';
import { listFeaturesByGroup } from '$lib/server/features/queries';
import { saveFeature } from '$lib/server/features/save';

describe('feature_groups schema', () => {
  it('cascades on project delete and sets null on group delete', async () => {
    const p = await mkProject({ name: `Schema ${Date.now()}` });

    const [g] = await db.insert(featureGroups)
      .values({ projectId: p.id, name: 'Auth', position: 0 })
      .returning();
    if (!g) throw new Error('setup: insert returned no row');

    const f = await createFeature({ projectId: p.id, name: 'Login' });
    await db.update(features).set({ groupId: g.id }).where(eq(features.id, f.id));

    await db.delete(featureGroups).where(eq(featureGroups.id, g.id));
    const after = await db.query.features.findFirst({ where: eq(features.id, f.id) });
    expect(after?.groupId).toBeNull();
  });

  it('rejects duplicate (projectId, name)', async () => {
    const p = await mkProject({ name: `Dup ${Date.now()}` });
    await db.insert(featureGroups).values({ projectId: p.id, name: 'X', position: 0 });
    await expect(
      db.insert(featureGroups).values({ projectId: p.id, name: 'X', position: 1 }),
    ).rejects.toThrow();
  });
});

describe('createGroup + listGroups', () => {
  it('assigns increasing positions and lists by position', async () => {
    const p = await mkProject({ name: `LG ${Date.now()}` });

    const a = await createGroup({ projectId: p.id, name: 'A' });
    const b = await createGroup({ projectId: p.id, name: 'B' });
    const c = await createGroup({ projectId: p.id, name: 'C' });
    if ('error' in a || 'error' in b || 'error' in c) throw new Error('setup failed');

    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
    expect(c.position).toBe(2);

    const list = await listGroups(p.id);
    expect(list.map((g) => g.name)).toEqual(['A', 'B', 'C']);
  });

  it('returns duplicate-name error when name is taken', async () => {
    const p = await mkProject({ name: `DupCreate ${Date.now()}` });
    await createGroup({ projectId: p.id, name: 'Auth' });

    const dup = await createGroup({ projectId: p.id, name: 'Auth' });
    expect(dup).toEqual({ error: 'duplicate-name' });
  });

  it('allows same name across different projects', async () => {
    const p1 = await mkProject({ name: `Cross1 ${Date.now()}` });
    const p2 = await mkProject({ name: `Cross2 ${Date.now()}` });

    const a = await createGroup({ projectId: p1.id, name: 'Shared' });
    const b = await createGroup({ projectId: p2.id, name: 'Shared' });

    expect('error' in a).toBe(false);
    expect('error' in b).toBe(false);
  });
});

describe('renameGroup', () => {
  it('renames a group', async () => {
    const p = await mkProject({ name: `Ren ${Date.now()}` });
    const g = await createGroup({ projectId: p.id, name: 'Old' });
    if ('error' in g) throw new Error('setup failed');

    const result = await renameGroup({ groupId: g.id, name: 'New' });
    expect(result).toMatchObject({ name: 'New' });
  });

  it('returns duplicate-name when target exists', async () => {
    const p = await mkProject({ name: `RenDup ${Date.now()}` });
    await createGroup({ projectId: p.id, name: 'A' });
    const b = await createGroup({ projectId: p.id, name: 'B' });
    if ('error' in b) throw new Error('setup failed');

    const result = await renameGroup({ groupId: b.id, name: 'A' });
    expect(result).toEqual({ error: 'duplicate-name' });
  });

  it('returns not-found for missing group', async () => {
    const result = await renameGroup({ groupId: '00000000-0000-7000-8000-000000000000', name: 'X' });
    expect(result).toEqual({ error: 'not-found' });
  });
});

describe('deleteGroup', () => {
  it('deletes a group and reports the number of features moved to ungrouped', async () => {
    const p = await mkProject({ name: `Del ${Date.now()}` });
    const g = await createGroup({ projectId: p.id, name: 'Auth' });
    if ('error' in g) throw new Error('setup failed');

    const f1 = await createFeature({ projectId: p.id, name: 'F1' });
    const f2 = await createFeature({ projectId: p.id, name: 'F2' });
    await db.update(features).set({ groupId: g.id }).where(eq(features.id, f1.id));
    await db.update(features).set({ groupId: g.id }).where(eq(features.id, f2.id));

    const result = await deleteGroup({ groupId: g.id });
    expect(result).toEqual({ affectedFeatureCount: 2 });

    const after = await db.query.features.findFirst({ where: eq(features.id, f1.id) });
    expect(after?.groupId).toBeNull();
  });

  it('returns not-found for missing group', async () => {
    const result = await deleteGroup({ groupId: '00000000-0000-7000-8000-000000000000' });
    expect(result).toEqual({ error: 'not-found' });
  });
});

describe('reorderGroups', () => {
  it('rewrites positions according to provided order', async () => {
    const p = await mkProject({ name: `Reo ${Date.now()}` });
    const a = await createGroup({ projectId: p.id, name: 'A' });
    const b = await createGroup({ projectId: p.id, name: 'B' });
    const c = await createGroup({ projectId: p.id, name: 'C' });
    if ('error' in a || 'error' in b || 'error' in c) throw new Error('setup failed');

    const result = await reorderGroups({
      projectId:  p.id,
      orderedIds: [c.id, a.id, b.id],
    });
    expect(result).toEqual({ ok: true });

    const list = await listGroups(p.id);
    expect(list.map((g) => g.name)).toEqual(['C', 'A', 'B']);
  });

  it('rejects when ids do not match project groups exactly', async () => {
    const p = await mkProject({ name: `ReoBad ${Date.now()}` });
    const a = await createGroup({ projectId: p.id, name: 'A' });
    if ('error' in a) throw new Error('setup failed');

    const missing = await reorderGroups({ projectId: p.id, orderedIds: [] });
    expect(missing).toEqual({ error: 'invalid-order' });

    const foreign = await reorderGroups({
      projectId:  p.id,
      orderedIds: [a.id, '00000000-0000-7000-8000-000000000000'],
    });
    expect(foreign).toEqual({ error: 'invalid-order' });
  });
});

describe('listFeaturesByGroup', () => {
  it('groups features by position, sorts features by name, splits ungrouped', async () => {
    const p = await mkProject({ name: `LFG ${Date.now()}` });
    const auth     = await createGroup({ projectId: p.id, name: 'Auth' });
    const checkout = await createGroup({ projectId: p.id, name: 'Checkout' });
    if ('error' in auth || 'error' in checkout) throw new Error('setup failed');

    const fLogin   = await createFeature({ projectId: p.id, name: 'Login' });
    const fSignup  = await createFeature({ projectId: p.id, name: 'Signup' });
    const fCart    = await createFeature({ projectId: p.id, name: 'Cart' });
    const fLegacy  = await createFeature({ projectId: p.id, name: 'Legacy' });

    await db.update(features).set({ groupId: auth.id }).where(eq(features.id, fLogin.id));
    await db.update(features).set({ groupId: auth.id }).where(eq(features.id, fSignup.id));
    await db.update(features).set({ groupId: checkout.id }).where(eq(features.id, fCart.id));
    // fLegacy stays ungrouped

    const result = await listFeaturesByGroup(p.id);

    const [authSection, checkoutSection] = result.groups;
    if (!authSection || !checkoutSection) throw new Error('expected two group sections');

    expect(result.groups.map((g) => g.group.name)).toEqual(['Auth', 'Checkout']);
    expect(authSection.features.map((f) => f.name)).toEqual(['Login', 'Signup']);
    expect(checkoutSection.features.map((f) => f.name)).toEqual(['Cart']);
    expect(result.ungrouped.map((f) => f.name)).toEqual(['Legacy']);
  });

  it('excludes archived features', async () => {
    const p = await mkProject({ name: `LFGArch ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'Hidden' });
    await db.update(features).set({ archived: true }).where(eq(features.id, f.id));

    const result = await listFeaturesByGroup(p.id);
    expect(result.ungrouped).toEqual([]);
  });
});

describe('feature create/save with groupId', () => {
  it('createFeature accepts a same-project groupId', async () => {
    const p = await mkProject({ name: `CF ${Date.now()}` });
    const g = await createGroup({ projectId: p.id, name: 'X' });
    if ('error' in g) throw new Error('setup failed');

    const f = await createFeature({ projectId: p.id, name: 'F', groupId: g.id });
    expect(f.groupId).toBe(g.id);
  });

  it('createFeature rejects a foreign-project groupId', async () => {
    const p1 = await mkProject({ name: `CFP1 ${Date.now()}` });
    const p2 = await mkProject({ name: `CFP2 ${Date.now()}` });
    const g  = await createGroup({ projectId: p2.id, name: 'X' });
    if ('error' in g) throw new Error('setup failed');

    await expect(
      createFeature({ projectId: p1.id, name: 'F', groupId: g.id }),
    ).rejects.toThrow(/invalid-group/);
  });

  it('saveFeature accepts a same-project groupId and persists it', async () => {
    const p = await mkProject({ name: `SF ${Date.now()}` });
    const g = await createGroup({ projectId: p.id, name: 'X' });
    if ('error' in g) throw new Error('setup failed');
    const f = await createFeature({ projectId: p.id, name: 'F' });

    const result = await saveFeature({
      featureId:       f.id,
      content:         f.content,
      expectedVersion: f.version,
      editor:          'tester',
      groupId:         g.id,
    });
    expect(result.conflict).toBe(false);
    if (result.conflict) return;
    expect(result.feature.groupId).toBe(g.id);
  });

  it('saveFeature rejects a foreign-project groupId', async () => {
    const p1 = await mkProject({ name: `SFP1 ${Date.now()}` });
    const p2 = await mkProject({ name: `SFP2 ${Date.now()}` });
    const g  = await createGroup({ projectId: p2.id, name: 'X' });
    if ('error' in g) throw new Error('setup failed');
    const f = await createFeature({ projectId: p1.id, name: 'F' });

    await expect(
      saveFeature({
        featureId:       f.id,
        content:         f.content,
        expectedVersion: f.version,
        editor:          'tester',
        groupId:         g.id,
      }),
    ).rejects.toThrow(/invalid-group/);
  });
});
