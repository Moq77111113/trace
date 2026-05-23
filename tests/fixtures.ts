import { allocateCodeSeq } from '$lib/server/features/internal/code-seq';
import { db } from '$lib/server/db/client';
import { features, policies, projects, user } from '$lib/server/db/schema';
import type { Action } from '$lib/server/authz/actions';

let counter = 0;
const next = () => ++counter;
const stamp = () => `${Date.now().toString(36)}-${next()}`;

type ProjectInsert = typeof projects.$inferInsert;
type FeatureInsert = typeof features.$inferInsert;

/**
 * Create a project with sensible defaults. Auto-generates `name`, `slug`,
 * `codePrefix` unless overridden, so tests don't have to think about A17 fields.
 */
export async function mkProject(overrides: Partial<ProjectInsert> = {}) {
  const s        = stamp();
  const name     = overrides.name       ?? `Test Project ${s}`;
  const slug     = overrides.slug       ?? `p-${s}`;
  const codePrefix = overrides.codePrefix ?? `tp${next()}`;

  const [row] = await db.insert(projects)
    .values({ ...overrides, name, slug, codePrefix })
    .returning();
  if (!row) throw new Error('mkProject: insert returned no row');
  return row;
}

/**
 * Create a feature with sensible defaults under `projectId`. Allocates `codeSeq`
 * via the same path as production (`allocateCodeSeq`).
 */
export async function mkFeature(projectId: string, overrides: Partial<FeatureInsert> = {}) {
  return db.transaction(async (tx) => {
    const codeSeq = await allocateCodeSeq(tx, projectId);
    const name    = overrides.name    ?? `Feature ${codeSeq}`;
    const content = overrides.content ?? `Feature: ${name}\n`;

    const [row] = await tx.insert(features)
      .values({ ...overrides, projectId, codeSeq, name, content })
      .returning();
    if (!row) throw new Error('mkFeature: insert returned no row');
    return row;
  });
}

type UserInsert = typeof user.$inferInsert;

/** Create a user with sensible defaults. Role defaults to 'user' via the schema. */
export async function mkUser(overrides: Partial<UserInsert> = {}) {
  const s = stamp();
  const [row] = await db.insert(user)
    .values({ name: overrides.name ?? `User ${s}`, email: overrides.email ?? `u-${s}@test.local`, ...overrides })
    .returning();
  if (!row) throw new Error('mkUser: insert returned no row');
  return row;
}

/** Grant `userId` an allow on `projectId` for `action` (default full authority). The copy-paste path for "this user can use this test project." */
export async function grantProjectAccess(userId: string, projectId: string, action: Action | '*' = '*') {
  await db.insert(policies).values({
    subjectKind: 'user', subjectId: userId, action,
    scopeKind: 'project', scopeId: projectId, effect: 'allow',
  });
}

/** Grant `userId` the instance superuser policy `(user, *, instance)` — for instance-route tests (boot seeding does not run mid-test). */
export async function grantInstanceAdmin(userId: string) {
  await db.insert(policies).values({
    subjectKind: 'user', subjectId: userId, action: '*',
    scopeKind: 'instance', scopeId: null, effect: 'allow',
  });
}
