import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaignFeatures, features } from '$lib/server/db/schema';
import { requireEditableCampaign } from './editable';

/** Adds a feature to a campaign at the next position. No-op if already a member. Rejects a feature from another project. */
export async function addMember(input: { campaignId: string; featureId: string; required?: boolean }) {
  const campaign = await requireEditableCampaign(input.campaignId);

  const [feature] = await db.select({ projectId: features.projectId }).from(features).where(eq(features.id, input.featureId));
  if (!feature || feature.projectId !== campaign.projectId) {
    throw new Error('addMember: feature does not belong to the campaign project');
  }

  const [agg] = await db
    .select({ max: sql<number>`COALESCE(MAX(${campaignFeatures.position}), 0)::int` })
    .from(campaignFeatures)
    .where(eq(campaignFeatures.campaignId, input.campaignId));

  await db
    .insert(campaignFeatures)
    .values({ campaignId: input.campaignId, featureId: input.featureId, required: input.required ?? true, position: (agg?.max ?? 0) + 1 })
    .onConflictDoNothing();
}

/** Removes a feature from a campaign. */
export async function removeMember(input: { campaignId: string; featureId: string }) {
  await requireEditableCampaign(input.campaignId);
  await db
    .delete(campaignFeatures)
    .where(and(eq(campaignFeatures.campaignId, input.campaignId), eq(campaignFeatures.featureId, input.featureId)));
}

/** Sets whether a member feature blocks the campaign's green verdict. */
export async function setMemberRequired(input: { campaignId: string; featureId: string; required: boolean }) {
  await requireEditableCampaign(input.campaignId);
  await db
    .update(campaignFeatures)
    .set({ required: input.required })
    .where(and(eq(campaignFeatures.campaignId, input.campaignId), eq(campaignFeatures.featureId, input.featureId)));
}

/** Rewrites member positions to match `orderedFeatureIds` (1-based, in order). */
export async function reorderMembers(input: { campaignId: string; orderedFeatureIds: string[] }) {
  await requireEditableCampaign(input.campaignId);
  await db.transaction(async (tx) => {
    for (let i = 0; i < input.orderedFeatureIds.length; i += 1) {
      await tx
        .update(campaignFeatures)
        .set({ position: i + 1 })
        .where(and(eq(campaignFeatures.campaignId, input.campaignId), eq(campaignFeatures.featureId, input.orderedFeatureIds[i] ?? '')));
    }
  });
}
