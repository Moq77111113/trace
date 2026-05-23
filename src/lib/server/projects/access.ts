import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies, user } from '$lib/server/db/schema';
import { ACTION_WILDCARD, type Action } from '$lib/server/authz/actions';
import { can, type PolicyRow, type ScopeRef, type SubjectRef } from '$lib/server/authz/evaluate';
import { roleForVerbs, verbsForRole, PROJECT_VERBS, type ProjectRole } from '$lib/server/authz/roles';
import { replaceSubjectProjectRole, deleteSubjectPoliciesAtScope } from '$lib/server/authz/policy-store';

/** A subject's access to one project: derived role, the user email (null for any-user), and the effective verbs. */
export type SubjectAccess = {
  subject:        SubjectRef;
  email:          string | null;
  role:           ProjectRole | 'custom';
  effectiveVerbs: Action[];
};

/** An instance user offered as an invite candidate. */
export type UserOption = { id: string; email: string; name: string | null };

const subjectKey = (s: SubjectRef): string => (s.kind === 'any-user' ? 'any-user' : `user:${s.id}`);
const rowSubject = (r: PolicyRow): SubjectRef | null =>
  r.subjectKind === 'any-user'
    ? { kind: 'any-user' }
    : (r.subjectId ? { kind: 'user', id: r.subjectId } : null);

/**
 * The subjects holding at least one project-scoped policy on `projectId`, each
 * with its derived role and effective verbs. The role is read from the subject's
 * own project-scope allow rows (`roleForVerbs`, else "custom"); effective verbs
 * are computed with the pure `can()` over the `[project, instance]` chain — which
 * honors deny-overrides and instance cascade, and (for a user) the any-user grants
 * that also apply to it. Instance-only subjects are not listed.
 */
export async function listProjectAccess(projectId: string): Promise<SubjectAccess[]> {
  const rows = await db
    .select({
      subjectKind: policies.subjectKind,
      subjectId:   policies.subjectId,
      action:      policies.action,
      scopeKind:   policies.scopeKind,
      scopeId:     policies.scopeId,
      effect:      policies.effect,
    })
    .from(policies)
    .where(or(and(eq(policies.scopeKind, 'project'), eq(policies.scopeId, projectId)), eq(policies.scopeKind, 'instance')));

  const all: PolicyRow[] = rows.map((r) => ({ ...r, action: r.action as PolicyRow['action'] }));
  const projectRows = all.filter((r) => r.scopeKind === 'project');

  const listed = new Map<string, SubjectRef>();
  for (const r of projectRows) {
    const s = rowSubject(r);
    if (s) listed.set(subjectKey(s), s);
  }

  const userEmails = await emailsFor([...listed.values()]);
  const scopeChain: ScopeRef[] = [{ kind: 'project', id: projectId }, { kind: 'instance' }];

  const result: SubjectAccess[] = [];
  for (const subject of listed.values()) {
    const subjects: SubjectRef[] = subject.kind === 'user' ? [subject, { kind: 'any-user' }] : [subject];
    const effectiveVerbs = PROJECT_VERBS.filter((action) => can({ subjects, action, scopeChain, policies: all }));

    const ownAllows = new Set(
      projectRows
        .filter((r) => {
          const rs = rowSubject(r);
          return rs !== null && subjectKey(rs) === subjectKey(subject) && r.effect === 'allow';
        })
        .map((r) => r.action),
    );

    result.push({
      subject,
      email:          subject.kind === 'user' ? (userEmails.get(subject.id) ?? null) : null,
      role:           roleForVerbs(ownAllows) ?? 'custom',
      effectiveVerbs,
    });
  }
  return result;
}

async function emailsFor(subjects: SubjectRef[]): Promise<Map<string, string>> {
  const ids = subjects.flatMap((s) => (s.kind === 'user' ? [s.id] : []));
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: user.id, email: user.email }).from(user).where(inArray(user.id, ids));
  return new Map(rows.map((r) => [r.id, r.email]));
}

/** Instance users that do not yet hold a project-scoped grant on `projectId` — the invite candidates. */
export async function listGrantableUsers(projectId: string): Promise<UserOption[]> {
  const granted = await db
    .selectDistinct({ subjectId: policies.subjectId })
    .from(policies)
    .where(and(eq(policies.scopeKind, 'project'), eq(policies.scopeId, projectId), eq(policies.subjectKind, 'user')));
  const grantedIds = new Set(granted.map((g) => g.subjectId).filter((id): id is string => id !== null));

  const users = await db.select({ id: user.id, email: user.email, name: user.name }).from(user).orderBy(asc(user.email));
  return users.filter((u) => !grantedIds.has(u.id));
}

/** A grant/revoke rejected by a project access invariant. The `code` maps to a user-facing message at the route. */
export class AccessRuleError extends Error {
  constructor(readonly code: 'last_manager' | 'any_user_manager') {
    super(code);
    this.name = 'AccessRuleError';
  }
}

async function projectUserManagers(projectId: string): Promise<Set<string>> {
  const rows = await db
    .select({ subjectId: policies.subjectId, action: policies.action })
    .from(policies)
    .where(and(
      eq(policies.scopeKind, 'project'),
      eq(policies.scopeId, projectId),
      eq(policies.subjectKind, 'user'),
      eq(policies.effect, 'allow'),
    ));
  const ids = new Set<string>();
  for (const r of rows) {
    if ((r.action === 'project.manage' || r.action === ACTION_WILDCARD) && r.subjectId) ids.add(r.subjectId);
  }
  return ids;
}

async function assertManagerRemains(projectId: string, subject: SubjectRef, subjectLosesManage: boolean): Promise<void> {
  if (!subjectLosesManage || subject.kind !== 'user') return;
  const managers = await projectUserManagers(projectId);
  if (managers.has(subject.id) && managers.size <= 1) throw new AccessRuleError('last_manager');
}

/**
 * Declaratively sets `subject`'s role on `projectId`, replacing their project-scoped
 * allow policies with the role's verb set. Refuses to make `any-user` a manager,
 * and refuses any change that would leave the project with no user-manager.
 */
export async function setProjectRole(projectId: string, subject: SubjectRef, role: ProjectRole): Promise<void> {
  if (subject.kind === 'any-user' && role === 'manager') throw new AccessRuleError('any_user_manager');
  const losesManage = role !== 'manager';
  await assertManagerRemains(projectId, subject, losesManage);
  await replaceSubjectProjectRole(subject, projectId, verbsForRole(role));
}

/** Removes all of `subject`'s project-scoped policies on `projectId`. Refuses to remove the last user-manager. */
export async function removeFromProject(projectId: string, subject: SubjectRef): Promise<void> {
  await assertManagerRemains(projectId, subject, true);
  await deleteSubjectPoliciesAtScope(subject, 'project', projectId);
}
