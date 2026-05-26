import { describe, it, expect } from 'vitest';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { projectCapabilities } from '$lib/server/authz/capabilities';
import { verbsForRole } from '$lib/server/authz/roles';
import { mkUser, mkProject, grantProjectAccess } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

describe('projectCapabilities', () => {
  it('returns exactly the verbs granted to a viewer', async () => {
    const u = await mkUser();
    const p = await mkProject();
    for (const verb of verbsForRole('viewer')) await grantProjectAccess(u.id, p.id, verb);

    const caps = await projectCapabilities(makeAuthorizer(asUser(u.id)), p.id);

    expect([...caps].sort()).toEqual([...verbsForRole('viewer')].sort());
  });

  it('grows with the editor role and never includes ungranted verbs', async () => {
    const u = await mkUser();
    const p = await mkProject();
    for (const verb of verbsForRole('editor')) await grantProjectAccess(u.id, p.id, verb);

    const caps = await projectCapabilities(makeAuthorizer(asUser(u.id)), p.id);

    expect(caps).toContain('feature.author');
    expect(caps).toContain('execution.run');
    expect(caps).not.toContain('project.manage');
  });

  it('an anonymous authorizer is granted nothing', async () => {
    const p = await mkProject();
    expect(await projectCapabilities(makeAuthorizer(null), p.id)).toEqual([]);
  });
});
