import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns } from '$lib/server/db/schema';

/** Loads a campaign and asserts it is still OPEN (mutations are forbidden once CLOSED). Throws if absent or closed. */
export async function requireEditableCampaign(campaignId: string) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
  if (!campaign) throw new Error(`campaign ${campaignId} not found`);
  if (campaign.status === 'CLOSED') throw new Error('campaign is closed');
  return campaign;
}
