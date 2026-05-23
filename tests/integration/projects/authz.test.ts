import { describe, it, expect } from 'vitest';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { accessibleProjectIds, requireProject, requireProjectById } from '$lib/server/projects/authz';
import { grantProjectAccess, mkProject, mkUser } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

describe('projects/authz', () => {
  it('requireProject returns the row when allowed, else 403, 404 unknown', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(u.id, p.id, 'project.access');
    expect((await requireProject(makeAuthorizer(asUser(u.id)), p.slug, 'project.access')).id).toBe(p.id);

    const other = await mkUser();
    await expect(requireProject(makeAuthorizer(asUser(other.id)), p.slug, 'project.access')).rejects.toMatchObject({ status: 403 });
    await expect(requireProject(makeAuthorizer(asUser(u.id)), 'no-slug', 'project.access')).rejects.toMatchObject({ status: 404 });
  });

  it('requireProjectById mirrors requireProject by id', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(u.id, p.id, 'feature.view');
    expect((await requireProjectById(makeAuthorizer(asUser(u.id)), p.id, 'feature.view')).id).toBe(p.id);
    await expect(requireProjectById(makeAuthorizer(asUser(u.id)), '00000000-0000-7000-8000-000000000000', 'feature.view'))
      .rejects.toMatchObject({ status: 404 });
  });

  it('accessibleProjectIds returns only allowed projects', async () => {
    const u  = await mkUser();
    const ok = await mkProject();
    const no = await mkProject();
    await grantProjectAccess(u.id, ok.id, 'project.access');
    const ids = await accessibleProjectIds(makeAuthorizer(asUser(u.id)));
    expect(ids.has(ok.id)).toBe(true);
    expect(ids.has(no.id)).toBe(false);
  });
});
