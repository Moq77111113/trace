import { asc, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns, campaignFeatures, features, projects } from '$lib/server/db/schema';
import { formatFeatureCode } from '$lib/shared/lib/slug';
import { computeProgress, type MemberStatus } from '../progress';

/** A campaign row enriched with its live progress, for the project list view. */
export type CampaignListItem = typeof campaigns.$inferSelect & { progress: Awaited<ReturnType<typeof computeProgress>> };

/** A member feature as shown on the campaign detail page. */
export type CampaignDetailMember = {
  featureId: string;
  code:      string;
  name:      string;
  required:  boolean;
  position:  number;
  status:    MemberStatus;
};

/** Campaigns in `projectId`, newest first, each with live progress. */
export async function listCampaignsForProject(projectId: string): Promise<CampaignListItem[]> {
  const rows = await db.select().from(campaigns).where(eq(campaigns.projectId, projectId)).orderBy(desc(campaigns.openedAt));
  return Promise.all(rows.map(async (c) => ({ ...c, progress: await computeProgress(c.id) })));
}

/** Full campaign detail (campaign + ordered members + live progress), or `null` if absent. */
export async function getCampaignDetail(campaignId: string) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
  if (!campaign) return null;

  const memberRows = await db
    .select({
      featureId:  campaignFeatures.featureId,
      required:   campaignFeatures.required,
      position:   campaignFeatures.position,
      name:       features.name,
      codeSeq:    features.codeSeq,
      codePrefix: projects.codePrefix,
    })
    .from(campaignFeatures)
    .innerJoin(features, eq(features.id, campaignFeatures.featureId))
    .innerJoin(projects, eq(projects.id, features.projectId))
    .where(eq(campaignFeatures.campaignId, campaignId))
    .orderBy(asc(campaignFeatures.position));

  const progress = await computeProgress(campaignId);
  const statusByFeature = new Map(progress.members.map((m) => [m.featureId, m.status]));

  const members: CampaignDetailMember[] = memberRows.map((r) => ({
    featureId: r.featureId,
    code:      formatFeatureCode(r.codePrefix, r.codeSeq),
    name:      r.name,
    required:  r.required,
    position:  r.position,
    status:    statusByFeature.get(r.featureId) ?? null,
  }));

  return { campaign, members, progress };
}
