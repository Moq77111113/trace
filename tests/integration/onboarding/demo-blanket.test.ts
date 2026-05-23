import { describe, it, expect, beforeEach } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies, projects, features, executions } from '$lib/server/db/schema';
import { seedDemoProject } from '$lib/server/onboarding/seed';
import { mkUser } from '$testing/fixtures';

const DEMO_NAME = 'Trace Demo';

// The demo project is a global singleton keyed by name; other test files create,
// delete and (via the backfill test) re-blanket it on the shared container. Clear
// it first so this test seeds a fresh demo and asserts against exactly its own grant.
async function clearDemo() {
  const [demo] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, DEMO_NAME));
  if (!demo) return;
  await db.delete(policies).where(and(eq(policies.scopeKind, 'project'), eq(policies.scopeId, demo.id)));
  const feats = await db.select({ id: features.id }).from(features).where(eq(features.projectId, demo.id));
  if (feats.length > 0) {
    await db.delete(executions).where(inArray(executions.featureId, feats.map((f) => f.id)));
  }
  await db.delete(projects).where(eq(projects.id, demo.id));
}

describe('seedDemoProject any-user blanket', () => {
  beforeEach(clearDemo);

  it('grants the any-user blanket so non-admins can access the demo', async () => {
    const admin = await mkUser({ role: 'admin' });
    await seedDemoProject(admin.id);

    const [demo] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, DEMO_NAME));
    if (!demo) throw new Error('demo not seeded');

    const rows = await db.select().from(policies).where(
      and(eq(policies.subjectKind, 'any-user'), eq(policies.scopeKind, 'project'), eq(policies.scopeId, demo.id)),
    );
    expect(rows.map((r) => r.action).sort()).toEqual(
      ['execution.review', 'execution.run', 'feature.author', 'feature.view', 'project.access'].sort(),
    );
  });
});
