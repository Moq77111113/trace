import { describe, it, expect } from 'vitest';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import {
  fetchPoliciesForUser,
  replaceSubjectProjectRole,
  deleteSubjectPoliciesAtScope,
  LastInstanceAdminError,
} from '$lib/server/authz/policy-store';
import { grantInstanceAdmin, mkProject, mkUser } from '$testing/fixtures';

const projectAllows = async (subjectId: string, projectId: string) =>
  db.select({ action: policies.action }).from(policies).where(
    and(
      eq(policies.subjectKind, 'user'),
      eq(policies.subjectId, subjectId),
      eq(policies.scopeKind, 'project'),
      eq(policies.scopeId, projectId),
      eq(policies.effect, 'allow'),
    ),
  );

describe('fetchPoliciesForUser', () => {
  it('returns the user-specific and any-user rows, not other users', async () => {
    const me    = await mkUser();
    const other = await mkUser();

    const inserted = await db.insert(policies).values([
      { subjectKind: 'user', subjectId: me.id,    action: 'feature.view', scopeKind: 'instance', scopeId: null, effect: 'allow' },
      { subjectKind: 'any-user', subjectId: null, action: 'project.access', scopeKind: 'instance', scopeId: null, effect: 'allow' },
      { subjectKind: 'user', subjectId: other.id, action: 'feature.author', scopeKind: 'instance', scopeId: null, effect: 'allow' },
    ]).returning({ id: policies.id });

    try {
      const rows = await fetchPoliciesForUser(me.id);
      expect(rows.some((r) => r.subjectKind === 'user' && r.subjectId === me.id && r.action === 'feature.view')).toBe(true);
      expect(rows.some((r) => r.subjectKind === 'any-user' && r.action === 'project.access')).toBe(true);
      expect(rows.some((r) => r.subjectId === other.id)).toBe(false);
    } finally {
      await db.delete(policies).where(inArray(policies.id, inserted.map((r) => r.id)));
    }
  });

  it('returns [] for an anonymous request', async () => {
    expect(await fetchPoliciesForUser(null)).toEqual([]);
  });
});

describe('authz/policy-store mutations', () => {
  it('replaceSubjectProjectRole replaces the subject project-scoped rows wholesale', async () => {
    const u = await mkUser();
    const p = await mkProject();

    await replaceSubjectProjectRole({ kind: 'user', id: u.id }, p.id, ['project.access', 'feature.view', 'feature.author']);
    expect((await projectAllows(u.id, p.id)).map((r) => r.action).sort())
      .toEqual(['feature.author', 'feature.view', 'project.access']);

    await replaceSubjectProjectRole({ kind: 'user', id: u.id }, p.id, ['project.access']);
    expect((await projectAllows(u.id, p.id)).map((r) => r.action)).toEqual(['project.access']);
  });

  it('deleteSubjectPoliciesAtScope removes all of a subject rows at one scope', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await replaceSubjectProjectRole({ kind: 'user', id: u.id }, p.id, ['project.access', 'feature.view']);

    await deleteSubjectPoliciesAtScope({ kind: 'user', id: u.id }, 'project', p.id);
    expect(await projectAllows(u.id, p.id)).toHaveLength(0);
  });

  it('refuses to delete the LAST (*, instance) allow, but allows a non-last one', async () => {
    const a = await mkUser();
    const b = await mkUser();

    await db.delete(policies).where(
      and(eq(policies.action, '*'), eq(policies.scopeKind, 'instance'), isNull(policies.scopeId), eq(policies.effect, 'allow')),
    );

    await grantInstanceAdmin(a.id);
    await grantInstanceAdmin(b.id);

    await deleteSubjectPoliciesAtScope({ kind: 'user', id: b.id }, 'instance', null);
    await expect(deleteSubjectPoliciesAtScope({ kind: 'user', id: a.id }, 'instance', null))
      .rejects.toBeInstanceOf(LastInstanceAdminError);

    const remaining = await db.select({ id: policies.id }).from(policies).where(
      and(eq(policies.action, '*'), eq(policies.scopeKind, 'instance'), isNull(policies.scopeId), eq(policies.effect, 'allow')),
    );
    expect(remaining.length).toBeGreaterThanOrEqual(1);
  });
});
