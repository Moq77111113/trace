import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies, projects, instanceSettings, user } from '$lib/server/db/schema';

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

const BLANKET_ACTIONS = ['project.access', 'feature.view', 'feature.author', 'execution.run', 'execution.review'] as const;

type PolicyInsert = typeof policies.$inferInsert;

/** The any-user blanket rows for one project: every usage verb except `project.manage`. */
function blanketRows(projectId: string): PolicyInsert[] {
  return BLANKET_ACTIONS.map((action) => ({
    subjectKind: 'any-user', subjectId: null,
    action, scopeKind: 'project', scopeId: projectId, effect: 'allow',
  }));
}

/** Grants the any-user blanket on a single project — used for the demo sandbox and any explicitly-public project. */
export async function grantAnyUserBlanket(projectId: string): Promise<void> {
  await db.insert(policies).values(blanketRows(projectId));
}

/**
 * One-time migration of pre-PBAC data: grants the `any-user` blanket (every
 * usage verb except `project.manage`) on each existing project, so current users
 * keep working when enforcement turns on. Gated by `instanceSettings.policiesBackfilledAt`
 * so it runs exactly once; new projects rely on their creator grant instead.
 */
export async function backfillExistingProjectsBlanket(): Promise<void> {
  await db.transaction(async (tx) => {
    const [settings] = await tx.select({ at: instanceSettings.policiesBackfilledAt })
      .from(instanceSettings).where(eq(instanceSettings.id, 1));
    if (!settings || settings.at) return;

    const existing = await tx.select({ id: projects.id }).from(projects);
    const rows = existing.flatMap((p) => blanketRows(p.id));
    if (rows.length > 0) await tx.insert(policies).values(rows);

    await tx.update(instanceSettings).set({ policiesBackfilledAt: new Date() }).where(eq(instanceSettings.id, 1));
  });
}
