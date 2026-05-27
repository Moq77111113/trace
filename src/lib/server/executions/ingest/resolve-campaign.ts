import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns, campaignFeatures } from '$lib/server/db/schema';

/** A campaign a CI run attributes to: its id and the feature ids that belong to it (only these get tagged). */
export type ResolvedCampaign = { id: string; members: Set<string> };

/** Resolves the OPEN campaign matching `requestedVersion` in the project, with its member feature ids. Returns no campaign plus a warning when the version matches nothing. */
export async function resolveCampaign(
  projectId: string,
  requestedVersion: string | undefined,
): Promise<{ campaign: ResolvedCampaign | null; warnings: string[] }> {
  if (!requestedVersion) return { campaign: null, warnings: [] };

  const [row] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(
      eq(campaigns.projectId, projectId),
      eq(campaigns.appVersion, requestedVersion),
      eq(campaigns.status, 'OPEN'),
    ));
  if (!row) {
    return { campaign: null, warnings: [`No open campaign targets version '${requestedVersion}'; executions ingested untagged.`] };
  }

  const memberRows = await db
    .select({ featureId: campaignFeatures.featureId })
    .from(campaignFeatures)
    .where(eq(campaignFeatures.campaignId, row.id));
  return { campaign: { id: row.id, members: new Set(memberRows.map((m) => m.featureId)) }, warnings: [] };
}
