import { describe, it, expect } from 'vitest';
import { createCampaign, createCampaignBody } from '$lib/server/campaigns/lifecycle/create';
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
});
