import { describe, it, expect } from 'vitest';
import { searchFeatures } from '$lib/server/search/queries';
import { mkFeature, mkProject, mkUser, grantProjectAccess } from '$testing/fixtures';
import { makeAuthorizer } from '$lib/server/authz/authorizer';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

describe('searchFeatures access filter', () => {
  it('returns hits only from accessible projects', async () => {
    const seen   = await mkProject();
    const hidden = await mkProject();
    await mkFeature(seen.id,   { name: 'ZZ Searchable Alpha' });
    await mkFeature(hidden.id, { name: 'ZZ Searchable Alpha' });
    const u = await mkUser();
    await grantProjectAccess(u.id, seen.id, 'project.access');
    const rows = await searchFeatures(makeAuthorizer(asUser(u.id)), 'ZZ Searchable Alpha');
    const ids = new Set(rows.map((r) => r.projectId));
    expect(ids.has(seen.id)).toBe(true);
    expect(ids.has(hidden.id)).toBe(false);
  });

  it('returns [] for a user with no access', async () => {
    const u = await mkUser();
    expect(await searchFeatures(makeAuthorizer(asUser(u.id)), 'anything')).toEqual([]);
  });
});
