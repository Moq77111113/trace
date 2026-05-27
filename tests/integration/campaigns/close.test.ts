import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { createCampaign } from '$lib/server/campaigns/lifecycle/create';
import { addMember } from '$lib/server/campaigns/lifecycle/members';
import { closeCampaign } from '$lib/server/campaigns/lifecycle/close';
import { mkProject, mkFeature } from '$testing/fixtures';

async function tag(featureId: string, campaignId: string, status: 'PASSED' | 'FAILED') {
  await db.insert(executions).values({
    featureId, source: 'CI', executedBy: 'ci', featureContentAtStart: 'x', status, campaignId,
  });
}

describe('closeCampaign', () => {
  it('records PASSED when every required member passed, and locks the campaign', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const c = await createCampaign({ projectId: project.id, name: 'C1', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: f1.id });
    await tag(f1.id, c.id, 'PASSED');

    const closed = await closeCampaign({ campaignId: c.id, closedBy: 'alice' });
    expect(closed.status).toBe('CLOSED');
    expect(closed.outcome).toBe('PASSED');
    expect(closed.closedBy).toBe('alice');
    expect(closed.closedAt).toBeInstanceOf(Date);
  });

  it('records FAILED when a required member did not pass', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const c = await createCampaign({ projectId: project.id, name: 'C2', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: f1.id });
    await tag(f1.id, c.id, 'FAILED');

    const closed = await closeCampaign({ campaignId: c.id, closedBy: 'bob' });
    expect(closed.outcome).toBe('FAILED');
  });

  it('refuses to close an already-closed campaign', async () => {
    const project = await mkProject();
    const c = await createCampaign({ projectId: project.id, name: 'C3', appVersion: '1', createdBy: 'x' });
    await closeCampaign({ campaignId: c.id, closedBy: 'x' });
    await expect(closeCampaign({ campaignId: c.id, closedBy: 'x' })).rejects.toThrow(/closed/);
  });

  it('locks membership mutation once closed', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const c = await createCampaign({ projectId: project.id, name: 'C4', appVersion: '1', createdBy: 'x' });
    await closeCampaign({ campaignId: c.id, closedBy: 'x' });
    await expect(addMember({ campaignId: c.id, featureId: f1.id })).rejects.toThrow(/closed/);
  });
});
