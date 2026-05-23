import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import type { Action, PolicyAction, ScopeKind } from './actions';
import { ACTION_WILDCARD } from './actions';
import type { PolicyRow, SubjectRef } from './evaluate';

/**
 * Loads every policy that could apply to a request from `userId`: the built-in
 * `any-user` rows plus the rows targeting that specific user. Returns `[]`
 * for an anonymous request (no logged-in identity, so nothing applies).
 */
export async function fetchPoliciesForUser(userId: string | null): Promise<PolicyRow[]> {
  if (!userId) return [];

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
    .where(
      or(
        eq(policies.subjectKind, 'any-user'),
        and(eq(policies.subjectKind, 'user'), eq(policies.subjectId, userId)),
      ),
    );

  return rows.map((r) => ({ ...r, action: r.action as PolicyAction }));
}

/** Thrown when a delete would remove the last `(*, instance, allow)` row, orphaning instance administration. */
export class LastInstanceAdminError extends Error {
  constructor() {
    super('Cannot revoke the last instance administrator.');
    this.name = 'LastInstanceAdminError';
  }
}

const subjectColumns = (subject: SubjectRef) =>
  subject.kind === 'any-user'
    ? { subjectKind: 'any-user' as const, subjectId: null }
    : { subjectKind: 'user' as const, subjectId: subject.id };

const subjectMatch = (subject: SubjectRef) => {
  const cols = subjectColumns(subject);
  return and(
    eq(policies.subjectKind, cols.subjectKind),
    cols.subjectId === null ? isNull(policies.subjectId) : eq(policies.subjectId, cols.subjectId),
  );
};

/**
 * Declaratively sets `subject`'s role at project scope: in one transaction,
 * deletes their existing project-scoped rows on `projectId` and inserts an
 * allow row per verb in `actions`. Project scope only, so the instance-admin
 * invariant cannot be touched here.
 */
export async function replaceSubjectProjectRole(subject: SubjectRef, projectId: string, actions: Action[]): Promise<void> {
  const cols = subjectColumns(subject);
  await db.transaction(async (tx) => {
    await tx.delete(policies).where(
      and(subjectMatch(subject), eq(policies.scopeKind, 'project'), eq(policies.scopeId, projectId)),
    );
    if (actions.length > 0) {
      await tx.insert(policies).values(
        actions.map((action) => ({ ...cols, action, scopeKind: 'project' as const, scopeId: projectId, effect: 'allow' as const })),
      );
    }
  });
}

const instanceAdminWhere = and(eq(policies.action, ACTION_WILDCARD), eq(policies.scopeKind, 'instance'), eq(policies.effect, 'allow'));

/**
 * Deletes all of `subject`'s rows at a single scope. Carries the LAST_INSTANCE_ADMIN
 * invariant: when the scope is the instance, it refuses (throws `LastInstanceAdminError`)
 * if the delete would remove the last surviving `(*, instance, allow)` row.
 */
export async function deleteSubjectPoliciesAtScope(subject: SubjectRef, scopeKind: ScopeKind, scopeId: string | null): Promise<void> {
  const scopeWhere = and(
    eq(policies.scopeKind, scopeKind),
    scopeId === null ? isNull(policies.scopeId) : eq(policies.scopeId, scopeId),
  );
  const target = and(subjectMatch(subject), scopeWhere);

  await db.transaction(async (tx) => {
    if (scopeKind === 'instance') {
      const admins   = await tx.select({ id: policies.id }).from(policies).where(instanceAdminWhere).for('update');
      const removing = await tx.select({ id: policies.id }).from(policies).where(and(target, instanceAdminWhere));
      if (removing.length > 0 && admins.length - removing.length < 1) {
        throw new LastInstanceAdminError();
      }
    }
    await tx.delete(policies).where(target);
  });
}
