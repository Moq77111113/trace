import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { POST } from '../../../../src/routes/(ci)/api/executions/ingest/+server';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { createApiKey } from '$lib/server/api-keys';
import { createCampaign } from '$lib/server/campaigns/lifecycle/create';
import { addMember } from '$lib/server/campaigns/lifecycle/members';
import { closeCampaign } from '$lib/server/campaigns/lifecycle/close';
import { mkFeature, mkProject } from '$testing/fixtures';
import { mkUser } from '$testing/integration/_helpers/api-key';

async function fetchWith(payload: unknown, headers: Record<string, string>): Promise<Response> {
  const request = new Request('http://test/api/executions/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  try {
    return await POST({ request, url: new URL(request.url) } as never);
  } catch (e) {
    if (isHttpError(e)) {
      return new Response(JSON.stringify(e.body), { status: e.status, headers: { 'content-type': 'application/json' } });
    }
    throw e;
  }
}

function cucumberPayload(featureName: string) {
  return [{
    id: featureName, name: featureName, tags: [],
    elements: [{ id: 's1', name: 'Scenario', type: 'scenario', steps: [{ name: 'step', result: { status: 'passed', duration: 1_000_000 } }] }],
  }];
}

async function seed() {
  const project = await mkProject({ name: `Attach ${Date.now()}-${Math.random()}`, codePrefix: 'at' });
  const feature = await mkFeature(project.id, { name: 'Login' });
  const u = await mkUser();
  const { key } = await createApiKey({ projectId: project.id, name: 'ci', userId: u.id, expiresAt: null });
  return { project, feature, auth: `Bearer ${key}` };
}

async function tagOf(executionId: string) {
  const [row] = await db.select({ campaignId: executions.campaignId }).from(executions).where(eq(executions.id, executionId));
  return row?.campaignId ?? null;
}

describe('CI ingest X-CI-Campaign-Id strict attach', () => {
  it('tags the execution when the campaign is OPEN and the feature is a member', async () => {
    const { project, feature, auth } = await seed();
    const c = await createCampaign({ projectId: project.id, name: 'Rel', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: feature.id });

    const res = await fetchWith(cucumberPayload('Login'), { authorization: auth, 'x-ci-campaign-id': c.id });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(await tagOf(body.executions[0].execution_id)).toBe(c.id);
  });

  it('leaves untagged and warns when the feature is not a member', async () => {
    const { project, auth } = await seed();
    const c = await createCampaign({ projectId: project.id, name: 'Rel', appVersion: '1', createdBy: 'x' });

    const res = await fetchWith(cucumberPayload('Login'), { authorization: auth, 'x-ci-campaign-id': c.id });
    const body = await res.json();
    expect(await tagOf(body.executions[0].execution_id)).toBeNull();
    expect(body.warnings.join(' ')).toMatch(/member/i);
  });

  it('leaves untagged and warns when the campaign is CLOSED', async () => {
    const { project, feature, auth } = await seed();
    const c = await createCampaign({ projectId: project.id, name: 'Rel', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: feature.id });
    await closeCampaign({ campaignId: c.id, closedBy: 'x' });

    const res = await fetchWith(cucumberPayload('Login'), { authorization: auth, 'x-ci-campaign-id': c.id });
    const body = await res.json();
    expect(await tagOf(body.executions[0].execution_id)).toBeNull();
    expect(body.warnings.length).toBeGreaterThan(0);
  });

  it('does not fail the ingest when the campaign id is malformed (not a uuid)', async () => {
    const { auth } = await seed();

    const res = await fetchWith(cucumberPayload('Login'), { authorization: auth, 'x-ci-campaign-id': 'not-a-uuid' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(await tagOf(body.executions[0].execution_id)).toBeNull();
    expect(body.warnings.length).toBeGreaterThan(0);
  });
});
