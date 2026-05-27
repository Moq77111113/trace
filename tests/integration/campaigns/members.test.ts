import { describe, it, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaignFeatures } from '$lib/server/db/schema';
import { createCampaign } from '$lib/server/campaigns/lifecycle/create';
import { addMember, removeMember, setMemberRequired, reorderMembers } from '$lib/server/campaigns/lifecycle/members';
import { unwrap } from '$lib/shared/lib/result';
import { mkProject, mkFeature } from '$testing/fixtures';

async function members(campaignId: string) {
  return db
    .select()
    .from(campaignFeatures)
    .where(eq(campaignFeatures.campaignId, campaignId))
    .orderBy(campaignFeatures.position);
}

describe('campaign membership', () => {
  it('appends features at the next position, required by default', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const f2 = await mkFeature(project.id);
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'M1', appVersion: '1', createdBy: 'x' }));

    await addMember({ campaignId: c.id, featureId: f1.id });
    await addMember({ campaignId: c.id, featureId: f2.id });

    const rows = await members(c.id);
    expect(rows.map((r) => r.featureId)).toEqual([f1.id, f2.id]);
    expect(rows.map((r) => r.position)).toEqual([1, 2]);
    expect(rows.every((r) => r.required)).toBe(true);
  });

  it('rejects a feature from another project', async () => {
    const a = await mkProject();
    const b = await mkProject();
    const foreign = await mkFeature(b.id);
    const c = unwrap(await createCampaign({ projectId: a.id, name: 'M2', appVersion: '1', createdBy: 'x' }));
    await expect(addMember({ campaignId: c.id, featureId: foreign.id })).rejects.toThrow(/project/);
  });

  it('toggles required and removes a member', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'M3', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: f1.id });

    await setMemberRequired({ campaignId: c.id, featureId: f1.id, required: false });
    const [row] = await db
      .select()
      .from(campaignFeatures)
      .where(and(eq(campaignFeatures.campaignId, c.id), eq(campaignFeatures.featureId, f1.id)));
    expect(row?.required).toBe(false);

    await removeMember({ campaignId: c.id, featureId: f1.id });
    expect(await members(c.id)).toHaveLength(0);
  });

  it('reorders members to the given feature-id order', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const f2 = await mkFeature(project.id);
    const c = unwrap(await createCampaign({ projectId: project.id, name: 'M4', appVersion: '1', createdBy: 'x' }));
    await addMember({ campaignId: c.id, featureId: f1.id });
    await addMember({ campaignId: c.id, featureId: f2.id });

    await reorderMembers({ campaignId: c.id, orderedFeatureIds: [f2.id, f1.id] });

    const rows = await members(c.id);
    expect(rows.map((r) => r.featureId)).toEqual([f2.id, f1.id]);
    expect(rows.map((r) => r.position)).toEqual([1, 2]);
  });
});
