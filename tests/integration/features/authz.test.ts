import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { requireFeature, requireFeatureById, visibleFeatureIds } from '$lib/server/features/authz';
import { grantProjectAccess, mkFeature, mkProject, mkUser } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

describe('features/authz', () => {
  it('requireFeature cascades a project grant and returns the feature', async () => {
    const u = await mkUser();
    const p = await mkProject();
    const f = await mkFeature(p.id);
    await grantProjectAccess(u.id, p.id, 'feature.view');
    const code = `${p.codePrefix}-${f.codeSeq}`;
    expect((await requireFeature(makeAuthorizer(asUser(u.id)), p.slug, code, 'feature.view')).id).toBe(f.id);
    await expect(requireFeature(makeAuthorizer(asUser(u.id)), p.slug, code, 'feature.author')).rejects.toMatchObject({ status: 403 });
    await expect(requireFeature(makeAuthorizer(asUser(u.id)), p.slug, `${p.codePrefix}-9999`, 'feature.view')).rejects.toMatchObject({ status: 404 });
  });

  it('requireFeatureById authorizes by id', async () => {
    const u = await mkUser();
    const p = await mkProject();
    const f = await mkFeature(p.id);
    await grantProjectAccess(u.id, p.id, 'execution.run');
    expect((await requireFeatureById(makeAuthorizer(asUser(u.id)), f.id, 'execution.run')).id).toBe(f.id);
  });

  it('visibleFeatureIds hides a feature-scoped deny', async () => {
    const u  = await mkUser();
    const p  = await mkProject();
    const f1 = await mkFeature(p.id);
    const f2 = await mkFeature(p.id);
    await grantProjectAccess(u.id, p.id, 'feature.view');
    await db.insert(policies).values({ subjectKind: 'user', subjectId: u.id, action: 'feature.view', scopeKind: 'feature', scopeId: f2.id, effect: 'deny' });
    const ids = await visibleFeatureIds(makeAuthorizer(asUser(u.id)), p.id, 'feature.view');
    expect(ids.has(f1.id)).toBe(true);
    expect(ids.has(f2.id)).toBe(false);
  });
});
