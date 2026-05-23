import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies, user } from '$lib/server/db/schema';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Grants a project's creator full authority over that project: `(user, *, project)` allow. */
export async function grantCreator(tx: Tx, userId: string, projectId: string): Promise<void> {
  await tx.insert(policies).values({
    subjectKind: 'user',
    subjectId:   userId,
    action:      '*',
    scopeKind:   'project',
    scopeId:     projectId,
    effect:      'allow',
  });
}

/**
 * Ensures every admin user holds a `(user, *, instance)` allow policy — the
 * superuser grant expressed as data. Idempotent: inserts only for admins that
 * lack one, so it is safe to run on every boot.
 */
export async function ensureAdminInstancePolicies(): Promise<void> {
  const admins = await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin'));

  for (const admin of admins) {
    const [existing] = await db.select({ id: policies.id }).from(policies).where(
      and(
        eq(policies.subjectKind, 'user'),
        eq(policies.subjectId, admin.id),
        eq(policies.action, '*'),
        eq(policies.scopeKind, 'instance'),
        isNull(policies.scopeId),
        eq(policies.effect, 'allow'),
      ),
    );
    if (existing) continue;

    await db.insert(policies).values({
      subjectKind: 'user', subjectId: admin.id,
      action: '*', scopeKind: 'instance', scopeId: null, effect: 'allow',
    });
  }
}
