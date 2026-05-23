import { describe, it, expect } from 'vitest';
import { load } from '../../../src/routes/(app)/p/[slug]/settings/api-keys/+page.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantProjectAccess, mkProject, mkUser } from '$testing/fixtures';

const userObj = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

it('403s with project.access but without project.manage', async () => {
  const u = await mkUser(); const p = await mkProject();
  await grantProjectAccess(u.id, p.id, 'project.access');
  const u0 = userObj(u.id);
  const event = { params: { slug: p.slug }, parent: async () => ({ breadcrumbs: [], project: p }), locals: { user: u0, authz: makeAuthorizer(u0) } } as unknown as Parameters<typeof load>[0];
  await expect(load(event)).rejects.toMatchObject({ status: 403 });
});
