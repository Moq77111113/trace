import { describe, it, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies, projects } from '$lib/server/db/schema';
import { createProject } from '$lib/server/projects/create';
import { ensureAdminInstancePolicies } from '$lib/server/authz/seed';
import { mkUser } from '$testing/fixtures';

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
