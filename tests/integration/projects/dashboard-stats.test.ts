import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { getProjectDashboardStats } from '$lib/server/projects/queries';
import { mkFeature, mkProject } from '$testing/fixtures';

async function seedProject() {
  return mkProject({ name: `Dash ${Date.now()}-${Math.random()}` });
}

async function seedFeature(projectId: string, name: string) {
  return mkFeature(projectId, { name, content: `Feature: ${name}\n\n  Scenario: A\n    Given x\n` });
}

async function seedRun(
  featureId: string,
  content: string,
  attrs: {
    status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'ABORTED' | 'IN_PROGRESS';
    startedAt: Date;
    finishedAt: Date | null;
  },
) {
  const [r] = await db
    .insert(executions)
    .values({
      featureId,
      source:                 'MANUAL',
      executedBy:             'Tester',
      environment:            null,
      featureContentAtStart:  content,
      status:                 attrs.status,
      startedAt:              attrs.startedAt,
      finishedAt:             attrs.finishedAt,
    })
    .returning();
  if (!r) throw new Error('seed: run insert failed');
  return r;
}

describe('getProjectDashboardStats', () => {
  it('returns zeros for a fresh project', async () => {
    const p = await seedProject();
    const stats = await getProjectDashboardStats(p.id);
    expect(stats).toEqual({ passed7d: 0, finished7d: 0, runsToday: 0, medianMs7d: null });
  });

  it('computes pass rate, runs today, and median over the last 7 days', async () => {
    const p = await seedProject();
    const f = await seedFeature(p.id, 'Login');

    const todayStart = new Date(); todayStart.setHours(2, 0, 0, 0);
    const todayEnd   = new Date(todayStart.getTime() + 10_000);     // 10s run
    const yesterday  = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(yesterday.getTime() + 30_000);    // 30s run
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const tenDaysAgoEnd = new Date(tenDaysAgo.getTime() + 90_000);  // outside 7d window

    await seedRun(f.id, f.content, { status: 'PASSED',  startedAt: todayStart, finishedAt: todayEnd });
    await seedRun(f.id, f.content, { status: 'FAILED',  startedAt: yesterday,  finishedAt: yesterdayEnd });
    await seedRun(f.id, f.content, { status: 'PASSED',  startedAt: tenDaysAgo, finishedAt: tenDaysAgoEnd });
    await seedRun(f.id, f.content, { status: 'IN_PROGRESS', startedAt: new Date(), finishedAt: null });

    const stats = await getProjectDashboardStats(p.id);

    expect(stats.passed7d).toBe(1);
    expect(stats.finished7d).toBe(2);
    expect(stats.runsToday).toBe(2);  // todayStart + the IN_PROGRESS started just now
    expect(stats.medianMs7d).toBeGreaterThanOrEqual(10_000);
    expect(stats.medianMs7d).toBeLessThanOrEqual(30_000);
  });

  it('scopes results to the project', async () => {
    const a = await seedProject();
    const b = await seedProject();
    const fa = await seedFeature(a.id, 'A');
    const fb = await seedFeature(b.id, 'B');

    const now = new Date();
    await seedRun(fa.id, fa.content, { status: 'PASSED', startedAt: now, finishedAt: now });
    await seedRun(fb.id, fb.content, { status: 'FAILED', startedAt: now, finishedAt: now });

    const statsA = await getProjectDashboardStats(a.id);
    const statsB = await getProjectDashboardStats(b.id);

    expect(statsA.passed7d).toBe(1);
    expect(statsA.finished7d).toBe(1);
    expect(statsB.passed7d).toBe(0);
    expect(statsB.finished7d).toBe(1);
  });
});
