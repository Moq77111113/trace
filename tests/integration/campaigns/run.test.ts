import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { startCampaignRun } from '$lib/server/campaigns/run';
import { createCampaign } from '$lib/server/campaigns/lifecycle/create';
import { addMember } from '$lib/server/campaigns/lifecycle/members';
import { closeCampaign } from '$lib/server/campaigns/lifecycle/close';
import { unwrap } from '$lib/shared/lib/result';
import { mkProject, mkFeature } from '$testing/fixtures';

const RUNNABLE = 'Feature: F\n  Scenario: S\n    Given a step\n';

describe('campaign-tagged runs', () => {
  it('startExecution tags the run with the given campaign', async () => {
    const project = await mkProject();
    const feature = await mkFeature(project.id, { content: RUNNABLE });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'R1', appVersion: '1', createdBy: 'x' }));
    const run = await startExecution({ featureId: feature.id, executedBy: 'tester', campaignId: c.id });
    const [row] = await db.select({ campaignId: executions.campaignId }).from(executions).where(eq(executions.id, run.id));
    expect(row?.campaignId).toBe(c.id);
  });

  it('startCampaignRun tags a member feature run', async () => {
    const project = await mkProject();
    const feature = await mkFeature(project.id, { content: RUNNABLE });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'R2', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: feature.id });
    const run = await startCampaignRun({ campaignId: c.id, featureId: feature.id, executedBy: 'tester' });
    expect(run.campaignId).toBe(c.id);
  });

  it('startCampaignRun rejects a non-member feature', async () => {
    const project = await mkProject();
    const feature = await mkFeature(project.id, { content: RUNNABLE });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'R3', appVersion: '1', createdBy: 'x' }));
    await expect(startCampaignRun({ campaignId: c.id, featureId: feature.id, executedBy: 'tester' })).rejects.toThrow(/member/);
  });

  it('startCampaignRun rejects a closed campaign', async () => {
    const project = await mkProject();
    const feature = await mkFeature(project.id, { content: RUNNABLE });
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'R4', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: feature.id });
    await closeCampaign({ campaignId: c.id, closedBy: 'x' });
    await expect(startCampaignRun({ campaignId: c.id, featureId: feature.id, executedBy: 'tester' })).rejects.toThrow(/closed/);
  });
});
