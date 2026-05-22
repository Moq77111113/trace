import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { POST } from '../../../../src/routes/(ci)/api/executions/ingest/+server';
import { createApiKey } from '$lib/server/api-keys';
import { mkFeature, mkProject } from '$testing/fixtures';
import { mkUser } from '$testing/integration/_helpers/api-key';

async function fetchWith(payload: unknown, headers: Record<string, string>): Promise<Response> {
  const request = new Request('http://test/api/executions/ingest', {
    method:  'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body:    JSON.stringify(payload),
  });
  try {
    return await POST({ request, url: new URL(request.url) } as never);
  } catch (e) {
    if (isHttpError(e)) {
      return new Response(JSON.stringify(e.body), {
        status:  e.status,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw e;
  }
}

async function seedProjectWithKey(features: string[] = ['Login']) {
  const project = await mkProject({ name: `Endpoint ${Date.now()}-${Math.random()}`, codePrefix: 'ep' });
  for (const name of features) await mkFeature(project.id, { name });
  const user    = await mkUser();
  const { key } = await createApiKey({ projectId: project.id, name: 'ci', userId: user.id, expiresAt: null });
  return { project, key, auth: `Bearer ${key}` };
}

function cucumberPayload(featureName: string, status: 'passed' | 'failed' = 'passed') {
  return [{
    id:       `${featureName}`,
    name:     featureName,
    tags:     [],
    elements: [{
      id: 's1', name: 'Scenario', type: 'scenario',
      steps: [{ name: 'step', result: { status, duration: 1_000_000 } }],
    }],
  }];
}

describe('POST /api/executions/ingest', () => {
  it('200 with new response shape when all features match', async () => {
    const { auth } = await seedProjectWithKey(['Login']);

    const res = await fetchWith(cucumberPayload('Login'), { authorization: auth });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('PASSED');
    expect(body.executions).toHaveLength(1);
    expect(body.executions[0].matched_via).toBe('gherkin-name');
    expect(body.executions[0].feature_code).toMatch(/^ep-\d+$/);
    expect(body.unknown_features).toEqual([]);
  });

  it('207 Multi-Status when some features match and some are unknown', async () => {
    const { auth } = await seedProjectWithKey(['Login']);

    const res = await fetchWith(
      [...cucumberPayload('Login'), ...cucumberPayload('Ghost')],
      { authorization: auth },
    );

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.executions).toHaveLength(1);
    expect(body.unknown_features).toEqual(['Ghost']);
  });

  it('404 with INGEST_NO_FEATURES_MATCHED when nothing matches', async () => {
    const { auth } = await seedProjectWithKey(['Login']);

    const res = await fetchWith(cucumberPayload('Ghost'), { authorization: auth });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('INGEST_NO_FEATURES_MATCHED');
  });

  it('400 PARSE_EMPTY_PAYLOAD when payload is []', async () => {
    const { auth } = await seedProjectWithKey();

    const res = await fetchWith([], { authorization: auth });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('PARSE_EMPTY_PAYLOAD');
  });

  it('401 CI_AUTH_HEADER_MISSING when no Authorization header', async () => {
    const res = await fetchWith(cucumberPayload('Login'), {});

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('CI_AUTH_HEADER_MISSING');
  });

  it('silently ignores X-Project-Id and X-CI-Feature-Code if present (clean break tolerance)', async () => {
    const { auth, project } = await seedProjectWithKey(['Login']);

    const res = await fetchWith(cucumberPayload('Login'), {
      authorization:       auth,
      'x-project-id':      'bogus-project-id',
      'x-ci-feature-code': 'irrelevant',
      'x-environment':     'staging',
      'x-ci-branch':       'main',
      'x-ci-commit':       'deadbeef',
      'x-ci-source':       'github-actions',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executions[0].feature_code).toMatch(new RegExp(`^${project.codePrefix}-\\d+$`));
  });
});
