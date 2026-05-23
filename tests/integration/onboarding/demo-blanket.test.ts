import { describe, it, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { policies, projects } from '$lib/server/db/schema';
import { seedDemoProject } from '$lib/server/onboarding/seed';
import { mkUser } from '$testing/fixtures';

describe('seedDemoProject any-user blanket', () => {
  it('grants the any-user blanket so non-admins can access the demo', async () => {
    const admin = await mkUser({ role: 'admin' });
    await seedDemoProject(admin.id);
    const [demo] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, 'Trace Demo'));
    if (!demo) throw new Error('demo not seeded');
    const rows = await db.select().from(policies).where(
      and(eq(policies.subjectKind, 'any-user'), eq(policies.scopeKind, 'project'), eq(policies.scopeId, demo.id)),
    );
    expect(rows.map((r) => r.action).sort()).toEqual(
      ['execution.review', 'execution.run', 'feature.author', 'feature.view', 'project.access'].sort(),
    );
  });
});
