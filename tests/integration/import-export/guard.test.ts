import { describe, it, expect } from 'vitest';
import { load } from '../../../src/routes/(app)/p/[slug]/export/+page.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { mkProject, mkUser } from '$testing/fixtures';

const userObj = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

it('export load 403s without feature.view', async () => {
  const u = await mkUser(); const p = await mkProject();
  const u0 = userObj(u.id);
  const event = { params: { slug: p.slug }, parent: async () => ({ breadcrumbs: [], project: p }), locals: { user: u0, authz: makeAuthorizer(u0) } } as unknown as Parameters<typeof load>[0];
  await expect(load(event)).rejects.toMatchObject({ status: 403 });
});
