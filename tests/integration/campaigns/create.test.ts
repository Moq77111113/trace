import { describe, it, expect } from 'vitest';
import { createCampaign, createCampaignBody } from '$lib/server/campaigns/lifecycle/create';
import { closeCampaign } from '$lib/server/campaigns/lifecycle/close';
import { unwrap } from '$lib/shared/lib/result';
import { mkProject } from '$testing/fixtures';

describe('createCampaign', () => {
  it('creates an OPEN campaign owned by the project', async () => {
    const project = await mkProject();
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'Q3 Release', appVersion: '3.0.0', createdBy: 'alice' }));
    expect(c.status).toBe('OPEN');
    expect(c.projectId).toBe(project.id);
    expect(c.appVersion).toBe('3.0.0');
    expect(c.createdBy).toBe('alice');
  });

  it('rejects a blank name at the zod boundary', () => {
    const parsed = createCampaignBody.safeParse({ name: '   ', appVersion: '1.0.0' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a second open campaign for the same version', async () => {
    const project = await mkProject();
    await createCampaign({ projectId: project.id, name: 'First', appVersion: '4.0.0', createdBy: 'a' });
    const dup = await createCampaign({ projectId: project.id, name: 'Second', appVersion: '4.0.0', createdBy: 'a' });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toBe('open-version-conflict');
  });

  it('rejects a duplicate name in the project', async () => {
    const project = await mkProject();
    await createCampaign({ projectId: project.id, name: 'Release', appVersion: '6.0.0', createdBy: 'a' });
    const dup = await createCampaign({ projectId: project.id, name: 'Release', appVersion: '6.0.1', createdBy: 'a' });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toBe('name-taken');
  });

  it('allows reusing a version once the prior campaign is closed', async () => {
    const project = await mkProject();
    const first = unwrap(await createCampaign({ projectId: project.id, name: 'First', appVersion: '5.0.0', createdBy: 'a' }));
    await closeCampaign({ campaignId: first.id, closedBy: 'a' });
    const second = unwrap(await createCampaign({ projectId: project.id, name: 'Second', appVersion: '5.0.0', createdBy: 'a' }));
    expect(second.status).toBe('OPEN');
  });
});
