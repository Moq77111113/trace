import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions, features, featureGroups, projects } from '$lib/server/db/schema';
import { listExecutionEnvironments, listExecutionsForProject } from '$lib/server/executions/queries';

async function seedProject() {
  const [p] = await db
    .insert(projects)
    .values({ name: `Hist ${Date.now()}-${Math.random()}` })
    .returning();
  if (!p) throw new Error('seed: project insert failed');
  return p;
}

async function seedFeature(projectId: string, name: string, groupId: string | null = null) {
  const [f] = await db
    .insert(features)
    .values({ projectId, groupId, name, content: `Feature: ${name}\n\n  Scenario: A\n    Given x\n` })
    .returning();
  if (!f) throw new Error('seed: feature insert failed');
  return f;
}

async function seedGroup(projectId: string, name: string) {
  const [g] = await db
    .insert(featureGroups)
    .values({ projectId, name, position: 0 })
    .returning();
  if (!g) throw new Error('seed: group insert failed');
  return g;
}

async function seedRun(
  featureId: string,
  content: string,
  attrs: { status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'IN_PROGRESS'; source: 'MANUAL' | 'CI'; environment: string | null; startedAt?: Date; executedBy?: string },
) {
  const [r] = await db
    .insert(executions)
    .values({
      featureId,
      source:              attrs.source,
      executedBy:          attrs.executedBy ?? 'Alice',
      environment:         attrs.environment,
      featureContentAtStart: content,
      status:              attrs.status,
      startedAt:           attrs.startedAt ?? new Date(),
      finishedAt:          attrs.status === 'IN_PROGRESS' ? null : (attrs.startedAt ?? new Date()),
    })
    .returning();
  if (!r) throw new Error('seed: run insert failed');
  return r;
}

describe('listExecutionsForProject — filters', () => {
  it('filters by status, source, environment', async () => {
    const p = await seedProject();
    const f = await seedFeature(p.id, 'Login');

    await seedRun(f.id, f.content, { status: 'PASSED', source: 'MANUAL', environment: 'staging' });
    await seedRun(f.id, f.content, { status: 'FAILED', source: 'CI',     environment: 'prod' });
    await seedRun(f.id, f.content, { status: 'PASSED', source: 'CI',     environment: 'staging' });

    const byStatus = await listExecutionsForProject(p.id, { status: 'FAILED' });
    expect(byStatus.total).toBe(1);
    expect(byStatus.rows[0]?.source).toBe('CI');

    const bySource = await listExecutionsForProject(p.id, { source: 'CI' });
    expect(bySource.total).toBe(2);

    const byEnv = await listExecutionsForProject(p.id, { environment: 'staging' });
    expect(byEnv.total).toBe(2);

    const combined = await listExecutionsForProject(p.id, { source: 'CI', environment: 'staging' });
    expect(combined.total).toBe(1);
    expect(combined.rows[0]?.status).toBe('PASSED');
  });

  it('filters by feature and group', async () => {
    const p     = await seedProject();
    const gA    = await seedGroup(p.id, 'A');
    const gB    = await seedGroup(p.id, 'B');
    const fA    = await seedFeature(p.id, 'In A', gA.id);
    const fB    = await seedFeature(p.id, 'In B', gB.id);
    const fNone = await seedFeature(p.id, 'Loose', null);

    await seedRun(fA.id,    fA.content,    { status: 'PASSED', source: 'MANUAL', environment: null });
    await seedRun(fB.id,    fB.content,    { status: 'PASSED', source: 'MANUAL', environment: null });
    await seedRun(fNone.id, fNone.content, { status: 'PASSED', source: 'MANUAL', environment: null });

    const byFeature = await listExecutionsForProject(p.id, { featureId: fA.id });
    expect(byFeature.total).toBe(1);
    expect(byFeature.rows[0]?.featureName).toBe('In A');

    const byGroup = await listExecutionsForProject(p.id, { groupId: gB.id });
    expect(byGroup.total).toBe(1);
    expect(byGroup.rows[0]?.featureName).toBe('In B');

    const ungrouped = await listExecutionsForProject(p.id, { groupId: 'ungrouped' });
    expect(ungrouped.total).toBe(1);
    expect(ungrouped.rows[0]?.featureName).toBe('Loose');
  });

  it('orders by startedAt desc and paginates', async () => {
    const p = await seedProject();
    const f = await seedFeature(p.id, 'Login');

    const baseTime = Date.now();
    for (let i = 0; i < 5; i++) {
      await seedRun(f.id, f.content, {
        status:      'PASSED',
        source:      'MANUAL',
        environment: null,
        startedAt:   new Date(baseTime + i * 1000),
        executedBy:  `Run ${i}`,
      });
    }

    const firstPage = await listExecutionsForProject(p.id, { pageSize: 2, page: 1 });
    expect(firstPage.total).toBe(5);
    expect(firstPage.rows.map((r) => r.executedBy)).toEqual(['Run 4', 'Run 3']);

    const secondPage = await listExecutionsForProject(p.id, { pageSize: 2, page: 2 });
    expect(secondPage.rows.map((r) => r.executedBy)).toEqual(['Run 2', 'Run 1']);

    const thirdPage = await listExecutionsForProject(p.id, { pageSize: 2, page: 3 });
    expect(thirdPage.rows.map((r) => r.executedBy)).toEqual(['Run 0']);
  });

  it('listExecutionEnvironments returns distinct non-null envs', async () => {
    const p = await seedProject();
    const f = await seedFeature(p.id, 'Login');

    await seedRun(f.id, f.content, { status: 'PASSED', source: 'MANUAL', environment: 'staging' });
    await seedRun(f.id, f.content, { status: 'PASSED', source: 'MANUAL', environment: 'prod'    });
    await seedRun(f.id, f.content, { status: 'PASSED', source: 'MANUAL', environment: 'staging' });
    await seedRun(f.id, f.content, { status: 'PASSED', source: 'MANUAL', environment: null      });

    const envs = await listExecutionEnvironments(p.id);
    expect(envs).toEqual(['prod', 'staging']);
  });
});
