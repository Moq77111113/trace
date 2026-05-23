import { describe, it, expect } from 'vitest';
import { actions } from '../../../src/routes/(app)/p/[slug]/+page.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { mkProject, mkUser } from '$testing/fixtures';

const userObj = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

it('createGroup 403s without feature.author', async () => {
  const u = await mkUser(); const p = await mkProject();
  const form = new FormData(); form.set('name', 'New Group');
  const u0 = userObj(u.id);
  const event = { params: { slug: p.slug }, request: new Request('http://localhost', { method: 'POST', body: form }), locals: { user: u0, authz: makeAuthorizer(u0) } } as unknown as Parameters<typeof actions.createGroup>[0];
  await expect(actions.createGroup(event)).rejects.toMatchObject({ status: 403 });
});
