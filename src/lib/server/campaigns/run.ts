import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns, campaignFeatures } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';

/** Starts a manual run of a member feature, tagged to the campaign. Rejects a closed campaign or a non-member feature. */
export async function startCampaignRun(input: { campaignId: string; featureId: string; executedBy: string; environment?: string | null }) {
  const [campaign] = await db.select({ status: campaigns.status }).from(campaigns).where(eq(campaigns.id, input.campaignId));
  if (!campaign) throw new Error(`startCampaignRun: campaign ${input.campaignId} not found`);
  if (campaign.status === 'CLOSED') throw new Error('startCampaignRun: campaign is closed');

  const [member] = await db
    .select({ featureId: campaignFeatures.featureId })
    .from(campaignFeatures)
    .where(and(eq(campaignFeatures.campaignId, input.campaignId), eq(campaignFeatures.featureId, input.featureId)));
  if (!member) throw new Error('startCampaignRun: feature is not a campaign member');

  return startExecution({ featureId: input.featureId, executedBy: input.executedBy, environment: input.environment ?? null, campaignId: input.campaignId });
}
