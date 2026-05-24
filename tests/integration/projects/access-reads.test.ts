import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { listProjectAccess, listGrantableUsers } from '$lib/server/projects/access';
import { replaceSubjectProjectRole } from '$lib/server/authz/policy-store';
import { verbsForRole } from '$lib/server/authz/roles';
import { grantInstanceAdmin, grantProjectAccess, mkProject, mkUser } from '$testing/fixtures';

describe('projects/access reads', () => {
  it('derives the role and effective verbs from project-scope allow rows', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await replaceSubjectProjectRole({ kind: 'user', id: u.id }, p.id, verbsForRole('editor'));

    const list = await listProjectAccess(p.id);
    const row = list.find((s) => s.subject.kind === 'user' && s.subject.id === u.id);
    expect(row?.role).toBe('editor');
    expect(new Set(row?.effectiveVerbs)).toEqual(new Set(verbsForRole('editor')));
    expect(row?.email).toBe(u.email);
  });

  it('lists the creator wildcard (*, project) as the Custom bucket', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(u.id, p.id, '*');

    const list = await listProjectAccess(p.id);
    const row = list.find((s) => s.subject.kind === 'user' && s.subject.id === u.id);
    expect(row?.role).toBe('custom');
    expect(new Set(row?.effectiveVerbs)).toEqual(new Set(verbsForRole('manager')));
  });

  it('effective verbs honor an instance-scope deny over a project allow', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await replaceSubjectProjectRole({ kind: 'user', id: u.id }, p.id, verbsForRole('viewer'));
    await db.insert(policies).values({
      subjectKind: 'user', subjectId: u.id, action: 'feature.view',
      scopeKind: 'instance', scopeId: null, effect: 'deny',
    });

    const list = await listProjectAccess(p.id);
    const row = list.find((s) => s.subject.kind === 'user' && s.subject.id === u.id);
    expect(row?.effectiveVerbs).not.toContain('feature.view');
    expect(row?.effectiveVerbs).toContain('project.access');
  });

  it('does not list instance admins (their access is instance-wide, not a project grant)', async () => {
    const admin = await mkUser({ role: 'admin' });
    await grantInstanceAdmin(admin.id);
    const p = await mkProject();

    const list = await listProjectAccess(p.id);
    expect(list.some((s) => s.subject.kind === 'user' && s.subject.id === admin.id)).toBe(false);
  });

  it('listGrantableUsers excludes users already holding a project-scope grant', async () => {
    const granted = await mkUser();
    const free    = await mkUser();
    const p = await mkProject();
    await replaceSubjectProjectRole({ kind: 'user', id: granted.id }, p.id, verbsForRole('viewer'));

    const candidates = await listGrantableUsers(p.id);
    const ids = candidates.map((c) => c.id);
    expect(ids).toContain(free.id);
    expect(ids).not.toContain(granted.id);
  });
});
