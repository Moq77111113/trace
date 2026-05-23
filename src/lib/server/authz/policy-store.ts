import { and, eq, or } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import type { PolicyAction } from './actions';
import type { PolicyRow } from './evaluate';

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
