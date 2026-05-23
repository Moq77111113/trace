import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { load } from '../../../src/routes/(app)/p/[slug]/+layout.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantProjectAccess, mkFeature, mkProject, mkUser } from '$testing/fixtures';
import type { FeaturesByGroup } from '$lib/server/features/read/queries';

type LayoutEvent = Parameters<typeof load>[0];
function buildEvent(slug: string, userId: string | null): LayoutEvent {
  const user = userId ? { id: userId, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null } : null;
  return { params: { slug }, parent: async () => ({ breadcrumbs: [] }), locals: { user, authz: makeAuthorizer(user) } } as unknown as LayoutEvent;
}

function allFeatureIds(tree: FeaturesByGroup): string[] {
  return [
    ...tree.groups.flatMap((g) => g.features.map((f) => f.id)),
    ...tree.ungrouped.map((f) => f.id),
  ];
}

describe('p/[slug] layout guard', () => {
  it('403s a user without project.access', async () => {
    const u = await mkUser(); const p = await mkProject();
    await expect(load(buildEvent(p.slug, u.id))).rejects.toMatchObject({ status: 403 });
  });

  it('404s an unknown slug', async () => {
    const u = await mkUser();
    await expect(load(buildEvent('no-such-slug', u.id))).rejects.toMatchObject({ status: 404 });
  });

  it('loads the project and hides features the user cannot view', async () => {
    const u = await mkUser(); const p = await mkProject();
    const f1 = await mkFeature(p.id); const f2 = await mkFeature(p.id);
    await grantProjectAccess(u.id, p.id, 'project.access');
    await grantProjectAccess(u.id, p.id, 'feature.view');
    await db.insert(policies).values({ subjectKind: 'user', subjectId: u.id, action: 'feature.view', scopeKind: 'feature', scopeId: f2.id, effect: 'deny' });
    const data = await load(buildEvent(p.slug, u.id));
    const ids = allFeatureIds(data.tree);
    expect(ids).toContain(f1.id);
    expect(ids).not.toContain(f2.id);
  });
});
