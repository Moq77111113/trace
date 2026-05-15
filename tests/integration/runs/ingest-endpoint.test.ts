import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from '$lib/server/db/client';
import { features, projects } from '$lib/server/db/schema';
import { createTestApiKey } from '../_helpers/api-key';
import { POST } from '../../../src/routes/(public)/api/runs/ingest/+server';

type IngestEvent = Parameters<typeof POST>[0];

async function seedProjectWithKey(featureName = 'Login') {
  const [p] = await db
    .insert(projects)
    .values({ name: `IngestApi ${Date.now()}-${Math.random()}` })
    .returning();
  if (!p) throw new Error('seed: project insert failed');

  const [f] = await db
    .insert(features)
    .values({
      projectId: p.id,
      name:      featureName,
      content:   `Feature: ${featureName}\n\n  Scenario: Successful login\n    Given x\n`,
    })
    .returning();
  if (!f) throw new Error('seed: feature insert failed');

  const { rawKey } = await createTestApiKey(p.id, 'ci-token');

  return { project: p, rawKey };
}

function buildEvent(body: string, headers: Record<string, string> = {}, searchParams: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/runs/ingest');
  for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);

  const request = new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });

  return { request, url } as unknown as IngestEvent;
}

async function invoke(event: IngestEvent) {
  try {
    const res = await POST(event);
    return { status: res.status, body: await res.json() as Record<string, unknown> };
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) {
      const err = e as { status: number; body: { message: string } };
      return { status: err.status, body: err.body };
    }
    throw e;
  }
}

describe('POST /api/runs/ingest', () => {
  it('accepts a cucumber.json and creates a CI run', async () => {
    const { project, rawKey } = await seedProjectWithKey();
    const body                = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'x-project-id':  project.id,
      'authorization': `Bearer ${rawKey}`,
      'x-environment': 'staging',
    }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status:            'PASSED',
      scenarios_matched: 1,
      scenarios_unknown: 0,
    });
  });

  it('returns 400 for missing project header', async () => {
    const res = await invoke(buildEvent('[]'));

    expect(res.status).toBe(400);
  });

  it('returns 401 when bearer token is missing', async () => {
    const { project } = await seedProjectWithKey();

    const res = await invoke(buildEvent('[]', { 'x-project-id': project.id }));

    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid bearer token', async () => {
    const { project } = await seedProjectWithKey();

    const res = await invoke(buildEvent('[]', {
      'x-project-id':  project.id,
      'authorization': 'Bearer crun_invalid_key',
    }));

    expect(res.status).toBe(401);
  });

  it('returns 401 when bearer is for a different project', async () => {
    const a = await seedProjectWithKey();
    const b = await seedProjectWithKey();

    const res = await invoke(buildEvent('[]', {
      'x-project-id':  a.project.id,
      'authorization': `Bearer ${b.rawKey}`,
    }));

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON body', async () => {
    const { project, rawKey } = await seedProjectWithKey();
    const res = await invoke(buildEvent('not-json', {
      'x-project-id':  project.id,
      'authorization': `Bearer ${rawKey}`,
    }));

    expect(res.status).toBe(400);
  });

  it('returns 404 when no feature matches', async () => {
    const { project, rawKey } = await seedProjectWithKey('SomeOther');
    const body                = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'x-project-id':  project.id,
      'authorization': `Bearer ${rawKey}`,
    }));

    expect(res.status).toBe(404);
  });

  it('accepts project via ?project= query param', async () => {
    const { project, rawKey } = await seedProjectWithKey();
    const body                = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'authorization': `Bearer ${rawKey}`,
    }, { project: project.id }));

    expect(res.status).toBe(201);
  });

  it('uses the API key name as executedBy on the run', async () => {
    const { project, rawKey } = await seedProjectWithKey();
    const body                = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'x-project-id':  project.id,
      'authorization': `Bearer ${rawKey}`,
    }));

    expect(res.status).toBe(201);

    const runId = (res.body as { run_id: string }).run_id;
    const [run] = await db.query.runs.findMany({
      where: (r, { eq }) => eq(r.id, runId),
    });

    expect(run?.executedBy).toBe('ci-token');
  });
});
