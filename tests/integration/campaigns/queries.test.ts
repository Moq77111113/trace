import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { createCampaign } from '$lib/server/campaigns/lifecycle/create';
import { addMember } from '$lib/server/campaigns/lifecycle/members';
import { startExecution } from '$lib/server/executions/run/start';
import { listCampaignsForProject, getCampaignDetail } from '$lib/server/campaigns/read/queries';
import { unwrap } from '$lib/shared/lib/result';
import { mkProject, mkFeature } from '$testing/fixtures';

const gherkinWithScenario = 'Feature: F\n  Scenario: does a thing\n    Given x\n';

describe('campaign read queries', () => {
  it('lists project campaigns newest-first with progress attached', async () => {
    const project = await mkProject();
    const older = unwrap(await createCampaign({ projectId: project.id, name: 'Older', appVersion: '1', createdBy: 'x' }));
    const newer = unwrap(await createCampaign({ projectId: project.id, name: 'Newer', appVersion: '2', createdBy: 'x' }));

    const list = await listCampaignsForProject(project.id);
    expect(list.map((c) => c.id).slice(0, 2)).toEqual([newer.id, older.id]);
    expect(list[0]?.progress.requiredTotal).toBe(0);
  });

  it('returns detail with member code, name, required flag, and live status', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id, { name: 'Checkout' });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'D1', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: f1.id });
    await db.insert(executions).values({
      featureId: f1.id, source: 'CI', executedBy: 'ci', featureContentAtStart: 'x', status: 'PASSED', campaignId: c.id,
    });

    const detail = await getCampaignDetail(c.id);
    expect(detail?.campaign.id).toBe(c.id);
    expect(detail?.members).toHaveLength(1);
    expect(detail?.members[0]?.name).toBe('Checkout');
    expect(detail?.members[0]?.code).toMatch(/^[a-z]/);
    expect(detail?.members[0]?.status).toBe('PASSED');
    expect(detail?.progress.outcome).toBe('PASSED');
  });

  it('marks a member runnable when its feature has gherkin scenarios', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id, { content: gherkinWithScenario });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'R1', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: f1.id });

    const detail = await getCampaignDetail(c.id);
    expect(detail?.members[0]?.runnable).toBe(true);
  });

  it('marks a member not runnable when its feature has no gherkin and no manual scenarios', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id, { content: '' });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'R2', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: f1.id });

    const detail = await getCampaignDetail(c.id);
    expect(detail?.members[0]?.runnable).toBe(false);
  });

  it('exposes latestExecutionId: null before any tagged run, the run id after', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id, { content: gherkinWithScenario });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'R3', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: f1.id });

    const before = await getCampaignDetail(c.id);
    expect(before?.members[0]?.latestExecutionId).toBeNull();

    const run = await startExecution({ featureId: f1.id, executedBy: 'x', campaignId: c.id });

    const after = await getCampaignDetail(c.id);
    expect(after?.members[0]?.latestExecutionId).toBe(run.id);
    expect(after?.members[0]?.status).toBe(run.status);
  });

  it('returns null for an unknown campaign', async () => {
    expect(await getCampaignDetail('00000000-0000-7000-8000-000000000000')).toBeNull();
  });
});
