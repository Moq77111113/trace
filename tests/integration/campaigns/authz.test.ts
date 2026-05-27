import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { campaigns } from '$lib/server/db/schema';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { requireCampaign } from '$lib/server/campaigns/authz';
import { mkProject, mkUser, grantProjectAccess } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

async function mkCampaign(projectId: string) {
  const [c] = await db
    .insert(campaigns)
    .values({ projectId, name: `C ${Date.now()}-${Math.random()}`, appVersion: '1.0.0', createdBy: 'seed' })
    .returning();
  if (!c) throw new Error('mkCampaign: insert returned no row');
  return c;
}

describe('requireCampaign', () => {
  it('returns the campaign when the user holds the action', async () => {
    const project = await mkProject();
    const c = await mkCampaign(project.id);
    const u = await mkUser();
    await grantProjectAccess(u.id, project.id, 'campaign.manage');
    const got = await requireCampaign(makeAuthorizer(asUser(u.id)), c.id, 'campaign.manage');
    expect(got.id).toBe(c.id);
  });

  it('throws 403 when the user lacks the action', async () => {
    const project = await mkProject();
    const c = await mkCampaign(project.id);
    const u = await mkUser();
    await grantProjectAccess(u.id, project.id, 'project.access');
    await expect(requireCampaign(makeAuthorizer(asUser(u.id)), c.id, 'campaign.manage'))
      .rejects.toMatchObject({ status: 403 });
  });

  it('throws 404 for an unknown campaign', async () => {
    const u = await mkUser();
    await expect(requireCampaign(makeAuthorizer(asUser(u.id)), '00000000-0000-7000-8000-000000000000', 'project.access'))
      .rejects.toMatchObject({ status: 404 });
  });
});
