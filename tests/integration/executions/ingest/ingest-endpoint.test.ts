import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from '$lib/server/db/client';
import { createTestApiKey } from '../../_helpers/api-key';
import { POST, type IngestSuccess } from '../../../../src/routes/(public)/api/executions/ingest/+server';
import { mkFeature, mkProject } from '../../../fixtures';

type IngestEvent = Parameters<typeof POST>[0];

async function seedProjectWithKey(featureName = 'Login') {
  const p = await mkProject({ name: `IngestApi ${Date.now()}-${Math.random()}` });
  const f = await mkFeature(p.id, {
    name:    featureName,
    content: `Feature: ${featureName}\n\n  Scenario: Successful login\n    Given x\n`,
  });
  const { rawKey } = await createTestApiKey(p.id, 'ci-token');
  return { project: p, feature: f, rawKey };
}

function buildEvent(body: string, headers: Record<string, string> = {}, searchParams: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/executions/ingest');
  for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);

  const request = new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });

  return { request, url } as unknown as IngestEvent;
}

async function invoke<TBody = IngestSuccess>(event: IngestEvent): Promise<{ status: number; body: TBody | { message: string } }> {
  try {
    const res = await POST(event);
    return { status: res.status, body: await res.json() as TBody };
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) {
      const err = e as { status: number; body: { message: string } };
      return { status: err.status, body: err.body };
    }
    throw e;
  }
}

function expectSuccess(body: IngestSuccess | { message: string }): IngestSuccess {
  if ('message' in body) throw new Error(`expected success, got error: ${body.message}`);
  return body;
}

describe('POST /api/executions/ingest', () => {
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

  it('matches by X-CI-Feature-Code when present, ignoring the parsed feature name', async () => {
    const { project, feature, rawKey } = await seedProjectWithKey('Some other name on disk');
    const body                         = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'x-project-id':       project.id,
      'authorization':      `Bearer ${rawKey}`,
      'x-ci-feature-code':  `${project.codePrefix}-${feature.codeSeq}`,
    }));

    expect(res.status).toBe(201);
    expect(expectSuccess(res.body).scenarios_matched).toBe(1);
  });

  it('persists ci_metadata from X-CI-Branch and X-CI-Commit headers', async () => {
    const { project, rawKey } = await seedProjectWithKey();
    const body                = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'x-project-id':  project.id,
      'authorization': `Bearer ${rawKey}`,
      'x-environment': 'staging',
      'x-ci-branch':   'feat/A9',
      'x-ci-commit':   'a3fa827abcdef',
    }));

    expect(res.status).toBe(201);

    const runId = expectSuccess(res.body).run_id;
    const { db }             = await import('$lib/server/db/client');
    const { executions }     = await import('$lib/server/db/schema');
    const { eq }             = await import('drizzle-orm');

    const [row] = await db.select().from(executions).where(eq(executions.id, runId));
    expect(row?.ciMetadata).toEqual({ branch: 'feat/A9', commit: 'a3fa827abcdef' });
  });

  it('leaves ci_metadata null when no CI headers are sent', async () => {
    const { project, rawKey } = await seedProjectWithKey();
    const body                = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'x-project-id':  project.id,
      'authorization': `Bearer ${rawKey}`,
    }));

    expect(res.status).toBe(201);

    const runId = expectSuccess(res.body).run_id;
    const { db }         = await import('$lib/server/db/client');
    const { executions } = await import('$lib/server/db/schema');
    const { eq }         = await import('drizzle-orm');

    const [row] = await db.select().from(executions).where(eq(executions.id, runId));
    expect(row?.ciMetadata).toBeNull();
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

    const executionId = (res.body as { run_id: string }).run_id;
    const [run] = await db.query.executions.findMany({
      where: (r, { eq }) => eq(r.id, executionId),
    });

    expect(run?.executedBy).toBe('ci-token');
  });
});
