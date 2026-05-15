import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from '$lib/server/db/client';
import { features, projects } from '$lib/server/db/schema';
import { POST } from '../../../src/routes/api/runs/ingest/+server';

type IngestEvent = Parameters<typeof POST>[0];

async function seedProject(featureName = 'Login') {
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

  return p;
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
    // SvelteKit's `error(status, message)` throws `{ status, body: { message } }`
    if (e && typeof e === 'object' && 'status' in e) {
      const err = e as { status: number; body: { message: string } };
      return { status: err.status, body: err.body };
    }
    throw e;
  }
}

describe('POST /api/runs/ingest', () => {
  it('accepts a cucumber.json and creates a CI run', async () => {
    const project = await seedProject();
    const body    = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {
      'x-project-id': project.id,
      'x-ci-source':  'github-actions',
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

  it('returns 400 for invalid JSON body', async () => {
    const project = await seedProject();
    const res = await invoke(buildEvent('not-json', { 'x-project-id': project.id }));

    expect(res.status).toBe(400);
  });

  it('returns 404 when no feature matches', async () => {
    const project = await seedProject('SomeOther');
    const body    = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, { 'x-project-id': project.id }));

    expect(res.status).toBe(404);
  });

  it('accepts project via ?project= query param', async () => {
    const project = await seedProject();
    const body    = readFileSync(resolve('tests/fixtures/cucumber-json/passed.json'), 'utf-8');

    const res = await invoke(buildEvent(body, {}, { project: project.id }));

    expect(res.status).toBe(201);
  });
});
