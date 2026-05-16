import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions, features, projects } from '$lib/server/db/schema';
import { GET } from '~/src/routes/(app)/projects/[pid]/executions/export.csv/+server';

type ExportEvent = Parameters<typeof GET>[0];

async function seedProject() {
  const [p] = await db
    .insert(projects)
    .values({ name: `Export ${Date.now()}-${Math.random()}` })
    .returning();
  if (!p) throw new Error('seed: project');
  return p;
}

async function seedFeature(projectId: string, name: string) {
  const [f] = await db
    .insert(features)
    .values({ projectId, name, content: `Feature: ${name}\n\n  Scenario: A\n    Given x\n` })
    .returning();
  if (!f) throw new Error('seed: feature');
  return f;
}

async function seedExecution(
  featureId: string,
  attrs: {
    status:      'PASSED' | 'FAILED' | 'SKIPPED' | 'IN_PROGRESS';
    source:      'MANUAL' | 'CI';
    environment: string | null;
    startedAt:   Date;
    executedBy?: string;
  },
) {
  const [r] = await db
    .insert(executions)
    .values({
      featureId,
      source:                attrs.source,
      executedBy:            attrs.executedBy ?? 'Alice',
      environment:           attrs.environment,
      featureContentAtStart: `Feature: x\n`,
      status:                attrs.status,
      startedAt:             attrs.startedAt,
      finishedAt:            attrs.status === 'IN_PROGRESS' ? null : attrs.startedAt,
    })
    .returning();
  if (!r) throw new Error('seed: execution');
  return r;
}

function buildEvent(projectId: string, searchParams: Record<string, string> = {}): ExportEvent {
  const url = new URL(`http://localhost/projects/${projectId}/executions/export.csv`);
  for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  return { params: { pid: projectId }, url } as unknown as ExportEvent;
}

async function invoke(event: ExportEvent) {
  const res = await GET(event);
  return { status: res.status, headers: res.headers, body: await res.text() };
}

describe('GET /projects/[pid]/executions/export.csv', () => {
  it('returns CSV with the right headers and one row per execution', async () => {
    const p = await seedProject();
    const f = await seedFeature(p.id, 'Login');

    await seedExecution(f.id, { status: 'PASSED', source: 'MANUAL', environment: 'staging', startedAt: new Date('2026-01-15T10:00:00Z') });
    await seedExecution(f.id, { status: 'FAILED', source: 'CI',     environment: 'prod',    startedAt: new Date('2026-01-16T10:00:00Z') });

    const res = await invoke(buildEvent(p.id));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="trace-executions-\d{4}-\d{2}-\d{2}\.csv"$/);

    const lines = res.body.trim().split('\r\n');
    expect(lines[0]).toBe(
      'execution_id,feature,status,source,executed_by,environment,ci_branch,ci_commit,started_at,finished_at,duration_seconds,passed,failed,skipped,pending',
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('FAILED');
    expect(lines[2]).toContain('PASSED');
  });

  it('honours the status filter via query string', async () => {
    const p = await seedProject();
    const f = await seedFeature(p.id, 'Login');

    await seedExecution(f.id, { status: 'PASSED', source: 'MANUAL', environment: null, startedAt: new Date('2026-02-01T10:00:00Z') });
    await seedExecution(f.id, { status: 'FAILED', source: 'CI',     environment: null, startedAt: new Date('2026-02-02T10:00:00Z') });
    await seedExecution(f.id, { status: 'FAILED', source: 'MANUAL', environment: null, startedAt: new Date('2026-02-03T10:00:00Z') });

    const res  = await invoke(buildEvent(p.id, { status: 'FAILED' }));
    const lines = res.body.trim().split('\r\n');

    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('FAILED');
    expect(lines[2]).toContain('FAILED');
  });

  it('returns header-only CSV when no executions match', async () => {
    const p = await seedProject();
    const res = await invoke(buildEvent(p.id));
    expect(res.status).toBe(200);
    expect(res.body.trim().split('\r\n')).toHaveLength(1);
  });
});
