import { describe, it, expect } from 'vitest';
import { load, actions } from '../../../src/routes/(app)/p/[slug]/settings/access/+page.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { listProjectAccess } from '$lib/server/projects/access';
import { grantProjectAccess, mkProject, mkUser } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

function loadEvent(actingId: string, project: { id: string; slug: string }) {
  return {
    params: { slug: project.slug },
    locals: { user: asUser(actingId), authz: makeAuthorizer(asUser(actingId)) },
    parent: async () => ({ breadcrumbs: [], project }),
  } as unknown as Parameters<typeof load>[0];
}

function actionEvent(actingId: string, project: { slug: string }, body: Record<string, string>) {
  return {
    params: { slug: project.slug },
    locals: { user: asUser(actingId), authz: makeAuthorizer(asUser(actingId)) },
    request: new Request('http://localhost', { method: 'POST', body: new URLSearchParams(body) }),
  } as unknown as Parameters<typeof actions.setRole>[0];
}

describe('settings/access route', () => {
  it('load throws 403 without project.manage', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(u.id, p.id, 'project.access');
    await expect(load(loadEvent(u.id, p))).rejects.toMatchObject({ status: 403 });
  });

  it('load returns subjects + grantable users for a manager', async () => {
    const mgr = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(mgr.id, p.id, '*');
    const data = await load(loadEvent(mgr.id, p));
    expect(Array.isArray(data.subjects)).toBe(true);
    expect(Array.isArray(data.grantableUsers)).toBe(true);
  });

  it('setRole grants a viewer; remove revokes', async () => {
    const mgr = await mkUser();
    const guest = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(mgr.id, p.id, '*');

    await actions.setRole(actionEvent(mgr.id, p, { subjectKind: 'user', subjectId: guest.id, role: 'viewer' }));
    expect((await listProjectAccess(p.id)).some((s) => s.subject.kind === 'user' && s.subject.id === guest.id)).toBe(true);

    await actions.remove(actionEvent(mgr.id, p, { subjectKind: 'user', subjectId: guest.id }));
    expect((await listProjectAccess(p.id)).some((s) => s.subject.kind === 'user' && s.subject.id === guest.id)).toBe(false);
  });

  it('setRole re-gates: a non-manager cannot grant', async () => {
    const viewer = await mkUser();
    const guest  = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(viewer.id, p.id, 'project.access');
    await expect(
      actions.setRole(actionEvent(viewer.id, p, { subjectKind: 'user', subjectId: guest.id, role: 'viewer' })),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('setRole returns fail(400) on an invariant violation (any-user -> manager)', async () => {
    const mgr = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(mgr.id, p.id, '*');
    const res = await actions.setRole(actionEvent(mgr.id, p, { subjectKind: 'any-user', role: 'manager' }));
    expect(res).toMatchObject({ status: 400 });
  });
});
