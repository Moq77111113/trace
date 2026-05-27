import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns } from '$lib/server/db/schema';
import { computeProgress } from '../progress';

/** Closes a campaign: freezes the verdict and locks further mutation. Throws if absent or already closed. */
export async function closeCampaign(input: { campaignId: string; closedBy: string }) {
  const progress = await computeProgress(input.campaignId);

  const [row] = await db
    .update(campaigns)
    .set({ status: 'CLOSED', outcome: progress.outcome, closedAt: new Date(), closedBy: input.closedBy })
    .where(and(eq(campaigns.id, input.campaignId), eq(campaigns.status, 'OPEN')))
    .returning();

  if (!row) throw new Error('closeCampaign: campaign not found or already closed');
  return row;
}
