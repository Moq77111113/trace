import { describe, it, expect } from 'vitest';
import { createCampaign, createCampaignBody } from '$lib/server/campaigns/lifecycle/create';
import { closeCampaign } from '$lib/server/campaigns/lifecycle/close';
import { mkProject } from '$testing/fixtures';

describe('createCampaign', () => {
  it('creates an OPEN campaign owned by the project', async () => {
    const project = await mkProject();
    const c = await createCampaign({ projectId: project.id, name: 'Q3 Release', appVersion: '3.0.0', createdBy: 'alice' });
    expect(c.status).toBe('OPEN');
    expect(c.projectId).toBe(project.id);
    expect(c.appVersion).toBe('3.0.0');
    expect(c.createdBy).toBe('alice');
  });

  it('rejects a blank name at the zod boundary', () => {
    const parsed = createCampaignBody.safeParse({ name: '   ', appVersion: '1.0.0' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a second open campaign for the same version with a 409', async () => {
    const project = await mkProject();
    await createCampaign({ projectId: project.id, name: 'First', appVersion: '4.0.0', createdBy: 'a' });
    await expect(
      createCampaign({ projectId: project.id, name: 'Second', appVersion: '4.0.0', createdBy: 'a' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('allows reusing a version once the prior campaign is closed', async () => {
    const project = await mkProject();
    const first = await createCampaign({ projectId: project.id, name: 'First', appVersion: '5.0.0', createdBy: 'a' });
    await closeCampaign({ campaignId: first.id, closedBy: 'a' });
    const second = await createCampaign({ projectId: project.id, name: 'Second', appVersion: '5.0.0', createdBy: 'a' });
    expect(second.status).toBe('OPEN');
  });
});
