import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { features, featureGroups, projects, runs } from '$lib/server/db/schema';
import { load } from '../../../src/routes/(app)/projects/[pid]/runs/+page.server';

type LoadEvent = Parameters<typeof load>[0];

function buildEvent(pid: string, search: Record<string, string> = {}): LoadEvent {
  const url = new URL(`http://localhost/projects/${pid}/runs`);
  for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v);
  return { params: { pid }, url } as unknown as LoadEvent;
}

async function seedFixture() {
  const [p] = await db
    .insert(projects)
    .values({ name: `RunsLoad ${Date.now()}-${Math.random()}` })
    .returning();
  if (!p) throw new Error('seed: project insert failed');

  const [g] = await db
    .insert(featureGroups)
    .values({ projectId: p.id, name: 'API', position: 0 })
    .returning();
  if (!g) throw new Error('seed: group insert failed');

  const [fApi] = await db
    .insert(features)
    .values({ projectId: p.id, groupId: g.id, name: 'Login API', content: 'Feature: x\n\n  Scenario: A\n    Given x\n' })
    .returning();
  if (!fApi) throw new Error('seed: feature insert failed');

  const [fUi] = await db
    .insert(features)
    .values({ projectId: p.id, groupId: null, name: 'Login UI', content: 'Feature: x\n\n  Scenario: A\n    Given x\n' })
    .returning();
  if (!fUi) throw new Error('seed: feature insert failed');

  await db.insert(runs).values({
    featureId:           fApi.id,
    source:              'CI',
    executedBy:          'github-actions',
    environment:         'staging',
    featureContentAtRun: fApi.content,
    status:              'FAILED',
    startedAt:           new Date(),
    finishedAt:          new Date(),
  });

  await db.insert(runs).values({
    featureId:           fUi.id,
    source:              'MANUAL',
    executedBy:          'Alice',
    environment:         'prod',
    featureContentAtRun: fUi.content,
    status:              'PASSED',
    startedAt:           new Date(),
    finishedAt:          new Date(),
  });

  return { project: p, group: g, fApi, fUi };
}

async function callLoad(event: LoadEvent) {
  return (await load(event)) as unknown as Awaited<ReturnType<typeof load>> & {
    filters: { status?: string; source?: string; environment?: string; featureId?: string; groupId?: string };
    rows:    { id: string; status: string; source: string; featureName: string }[];
    total:   number;
  };
}

describe('runs page server load — URL query params drive filters', () => {
  it('reads no filters when URL has no params', async () => {
    const { project } = await seedFixture();
    const data = await callLoad(buildEvent(project.id));

    expect(data.total).toBe(2);
    expect(data.filters.status).toBeUndefined();
    expect(data.filters.source).toBeUndefined();
  });

  it('?status=FAILED narrows the result and round-trips into filters', async () => {
    const { project } = await seedFixture();
    const data = await callLoad(buildEvent(project.id, { status: 'FAILED' }));

    expect(data.filters.status).toBe('FAILED');
    expect(data.total).toBe(1);
    expect(data.rows[0]?.status).toBe('FAILED');
  });

  it('combines ?source=CI&environment=staging', async () => {
    const { project } = await seedFixture();
    const data = await callLoad(buildEvent(project.id, { source: 'CI', environment: 'staging' }));

    expect(data.filters.source).toBe('CI');
    expect(data.filters.environment).toBe('staging');
    expect(data.total).toBe(1);
    expect(data.rows[0]?.source).toBe('CI');
  });

  it('?feature=<id> narrows to one feature', async () => {
    const { project, fApi } = await seedFixture();
    const data = await callLoad(buildEvent(project.id, { feature: fApi.id }));

    expect(data.filters.featureId).toBe(fApi.id);
    expect(data.total).toBe(1);
    expect(data.rows[0]?.featureName).toBe('Login API');
  });

  it('?group=<id> narrows to one group, ?group=ungrouped picks NULL group_id', async () => {
    const { project, group } = await seedFixture();

    const grouped = await callLoad(buildEvent(project.id, { group: group.id }));
    expect(grouped.filters.groupId).toBe(group.id);
    expect(grouped.total).toBe(1);
    expect(grouped.rows[0]?.featureName).toBe('Login API');

    const ungrouped = await callLoad(buildEvent(project.id, { group: 'ungrouped' }));
    expect(ungrouped.filters.groupId).toBe('ungrouped');
    expect(ungrouped.total).toBe(1);
    expect(ungrouped.rows[0]?.featureName).toBe('Login UI');
  });

  it('rejects unknown status/source values (no filter applied)', async () => {
    const { project } = await seedFixture();
    const data = await callLoad(buildEvent(project.id, { status: 'NOPE' }));

    expect(data.filters.status).toBeUndefined();
    expect(data.total).toBe(2);
  });
});
