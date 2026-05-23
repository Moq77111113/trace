import { describe, it, expect } from 'vitest';
import { setProjectRole, removeFromProject, listProjectAccess, AccessRuleError } from '$lib/server/projects/access';
import { mkProject, mkUser } from '$testing/fixtures';

const roleOf = (list: Awaited<ReturnType<typeof listProjectAccess>>, id: string) =>
  list.find((s) => s.subject.kind === 'user' && s.subject.id === id)?.role;

describe('projects/access writes', () => {
  it('setProjectRole declaratively replaces a role (editor -> viewer drops author/run)', async () => {
    const m1 = await mkUser();
    const u  = await mkUser();
    const p  = await mkProject();
    await setProjectRole(p.id, { kind: 'user', id: m1.id }, 'manager');
    await setProjectRole(p.id, { kind: 'user', id: u.id }, 'editor');

    await setProjectRole(p.id, { kind: 'user', id: u.id }, 'viewer');
    expect(roleOf(await listProjectAccess(p.id), u.id)).toBe('viewer');
  });

  it('rejects any-user -> manager, allows any-user -> editor', async () => {
    const p = await mkProject();
    await expect(setProjectRole(p.id, { kind: 'any-user' }, 'manager')).rejects.toBeInstanceOf(AccessRuleError);
    await setProjectRole(p.id, { kind: 'any-user' }, 'editor');
  });

  it('refuses to drop the last user-manager (downgrade)', async () => {
    const sole = await mkUser();
    const p = await mkProject();
    await setProjectRole(p.id, { kind: 'user', id: sole.id }, 'manager');
    await expect(setProjectRole(p.id, { kind: 'user', id: sole.id }, 'viewer')).rejects.toBeInstanceOf(AccessRuleError);
  });

  it('refuses to remove the last user-manager, allows removing a non-last one', async () => {
    const a = await mkUser();
    const b = await mkUser();
    const p = await mkProject();
    await setProjectRole(p.id, { kind: 'user', id: a.id }, 'manager');
    await setProjectRole(p.id, { kind: 'user', id: b.id }, 'manager');

    await removeFromProject(p.id, { kind: 'user', id: b.id });
    await expect(removeFromProject(p.id, { kind: 'user', id: a.id })).rejects.toBeInstanceOf(AccessRuleError);
  });

  it('allows removing a non-manager subject freely', async () => {
    const mgr = await mkUser();
    const viewer = await mkUser();
    const p = await mkProject();
    await setProjectRole(p.id, { kind: 'user', id: mgr.id }, 'manager');
    await setProjectRole(p.id, { kind: 'user', id: viewer.id }, 'viewer');

    await removeFromProject(p.id, { kind: 'user', id: viewer.id });
    expect(roleOf(await listProjectAccess(p.id), viewer.id)).toBeUndefined();
  });
});
