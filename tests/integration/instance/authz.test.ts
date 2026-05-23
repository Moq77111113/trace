import { describe, it, expect } from 'vitest';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { requireInstanceAdmin } from '$lib/server/instance/authz';
import { grantInstanceAdmin, mkUser } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

describe('instance/authz', () => {
  it('returns the acting user when granted instance.administer', async () => {
    const u = await mkUser();
    await grantInstanceAdmin(u.id);
    expect((await requireInstanceAdmin(makeAuthorizer(asUser(u.id)))).id).toBe(u.id);
  });

  it('403s a user without the grant and anonymous', async () => {
    const u = await mkUser();
    await expect(requireInstanceAdmin(makeAuthorizer(asUser(u.id)))).rejects.toMatchObject({ status: 403 });
    await expect(requireInstanceAdmin(makeAuthorizer(null))).rejects.toMatchObject({ status: 403 });
  });
});
