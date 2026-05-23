import { describe, it, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies, projects, instanceSettings } from '$lib/server/db/schema';
import { createProject } from '$lib/server/projects/create';
import { ensureAdminInstancePolicies, backfillExistingProjectsBlanket } from '$lib/server/authz/seed';
import { mkProject, mkUser } from '$testing/fixtures';

describe('grantCreator (via createProject)', () => {
  it('seeds a (user, *, project) allow row and stamps createdBy', async () => {
    const creator = await mkUser();
    const result  = await createProject({ name: `Owned ${Date.now()}` }, creator.id);
    if (!result.ok) throw new Error(`createProject failed: ${result.error}`);

    const [project] = await db.select().from(projects).where(eq(projects.id, result.value.id));
    expect(project?.createdBy).toBe(creator.id);

    const rows = await db.select().from(policies).where(
      and(eq(policies.subjectId, creator.id), eq(policies.scopeKind, 'project'), eq(policies.scopeId, result.value.id)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('*');
    expect(rows[0]?.effect).toBe('allow');
  });
});

describe('ensureAdminInstancePolicies', () => {
  it('grants (user, *, instance) to admins lacking it, idempotently', async () => {
    const admin = await mkUser({ role: 'admin' });

    await ensureAdminInstancePolicies();
    await ensureAdminInstancePolicies(); // second run must not duplicate

    const rows = await db.select().from(policies).where(
      and(eq(policies.subjectId, admin.id), eq(policies.scopeKind, 'instance')),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('*');
    expect(rows[0]?.effect).toBe('allow');
  });

  it('does not grant anything to non-admins', async () => {
    const plain = await mkUser({ role: 'user' });
    await ensureAdminInstancePolicies();
    const rows = await db.select().from(policies).where(
      and(eq(policies.subjectId, plain.id), eq(policies.scopeKind, 'instance')),
    );
    expect(rows).toHaveLength(0);
  });
});

describe('backfillExistingProjectsBlanket', () => {
  it('grants the any-user blanket to existing projects exactly once', async () => {
    // ensure the singleton settings row exists and is not yet backfilled
    await db.insert(instanceSettings).values({ id: 1 }).onConflictDoNothing();
    await db.update(instanceSettings).set({ policiesBackfilledAt: null }).where(eq(instanceSettings.id, 1));

    const p = await mkProject();

    await backfillExistingProjectsBlanket();
    await backfillExistingProjectsBlanket(); // second run is a no-op (marker set)

    const rows = await db.select().from(policies).where(
      and(eq(policies.subjectKind, 'any-user'), eq(policies.scopeKind, 'project'), eq(policies.scopeId, p.id)),
    );
    const actions = rows.map((r) => r.action).sort();
    expect(actions).toEqual(['execution.review', 'execution.run', 'feature.author', 'feature.view', 'project.access'].sort());
    expect(rows.every((r) => r.effect === 'allow')).toBe(true);
  });
});
