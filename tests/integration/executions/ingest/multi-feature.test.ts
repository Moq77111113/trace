import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST } from '../../../../src/routes/(ci)/api/executions/ingest/+server';
import { isHttpError } from '@sveltejs/kit';
import { createApiKey } from '$lib/server/api-keys';
import { mkFeature, mkProject } from '$testing/fixtures';
import { mkUser } from '$testing/integration/_helpers/api-key';

function loadMulti() {
  return JSON.parse(readFileSync(resolve('tests/fixtures/cucumber-json/multi.json'), 'utf-8'));
}

async function post(payload: unknown, key: string): Promise<Response> {
  const request = new Request('http://test/api/executions/ingest', {
    method:  'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body:    JSON.stringify(payload),
  });
  try {
    return await POST({ request, url: new URL(request.url) } as never);
  } catch (e) {
    if (isHttpError(e)) {
      const status = (e as { status: number }).status;
      const body   = (e as { body: unknown }).body;
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }
    throw e;
  }
}

describe('POST /api/executions/ingest — multi-feature payload', () => {
  it('creates one execution per feature when all match (mix of tag + name)', async () => {
    const project = await mkProject({ name: `Multi e2e ${Date.now()}-${Math.random()}`, codePrefix: 'tp1' });
    await mkFeature(project.id, { name: 'Login' });
    await mkFeature(project.id, { name: 'Signup' });
    await mkFeature(project.id, { name: 'Checkout' });
    const user    = await mkUser();
    const { key } = await createApiKey({ projectId: project.id, name: 'ci', userId: user.id, expiresAt: null });

    const res = await post(loadMulti(), key);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('FAILED');
    expect(body.executions).toHaveLength(3);
    expect(body.executions.map((e: { feature_code: string }) => e.feature_code)).toEqual(['tp1-1', 'tp1-2', 'tp1-3']);
    expect(body.executions[0].matched_via).toBe('code');
    expect(body.executions[1].matched_via).toBe('gherkin-name');
    expect(body.executions[2].matched_via).toBe('gherkin-name');
    expect(body.unknown_features).toEqual([]);

    const nameWarnings = body.warnings.filter((w: string) => w.includes('matched by name'));
    expect(nameWarnings).toHaveLength(2);
    expect(nameWarnings.some((w: string) => w.includes('tp1-2'))).toBe(true);
    expect(nameWarnings.some((w: string) => w.includes('tp1-3'))).toBe(true);
  });

  it('returns 207 when only Login matches and Signup/Checkout are unknown', async () => {
    const project = await mkProject({ name: `Partial e2e ${Date.now()}-${Math.random()}`, codePrefix: 'tp1' });
    await mkFeature(project.id, { name: 'Login' });
    const user    = await mkUser();
    const { key } = await createApiKey({ projectId: project.id, name: 'ci', userId: user.id, expiresAt: null });

    const res = await post(loadMulti(), key);

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.executions).toHaveLength(1);
    expect(body.unknown_features.sort()).toEqual(['Checkout', 'Signup']);
  });
});
