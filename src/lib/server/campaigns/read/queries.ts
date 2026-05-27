import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns, campaignFeatures, features, manualScenarios, projects } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import { formatFeatureCode } from '$lib/shared/lib/slug';
import { computeProgress, type MemberStatus } from '../progress';

/** A campaign row enriched with its live progress, for the project list view. */
export type CampaignListItem = typeof campaigns.$inferSelect & { progress: Awaited<ReturnType<typeof computeProgress>> };

/** A member feature as shown on the campaign detail page. */
export type CampaignDetailMember = {
  featureId:         string;
  code:              string;
  name:              string;
  required:          boolean;
  position:          number;
  status:            MemberStatus;
  runnable:          boolean;
  latestExecutionId: string | null;
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
      featureId:   campaignFeatures.featureId,
      required:    campaignFeatures.required,
      position:    campaignFeatures.position,
      name:        features.name,
      codeSeq:     features.codeSeq,
      codePrefix:  projects.codePrefix,
      content:     features.content,
      parseErrors: features.parseErrors,
    })
    .from(campaignFeatures)
    .innerJoin(features, eq(features.id, campaignFeatures.featureId))
    .innerJoin(projects, eq(projects.id, features.projectId))
    .where(eq(campaignFeatures.campaignId, campaignId))
    .orderBy(asc(campaignFeatures.position));

  const progress = await computeProgress(campaignId);
  const latestByFeature = new Map(progress.members.map((m) => [m.featureId, m]));
  const activeManualCount = await countActiveManualScenarios(memberRows.map((r) => r.featureId));

  const members: CampaignDetailMember[] = memberRows.map((r) => {
    const latest = latestByFeature.get(r.featureId);
    return {
      featureId:         r.featureId,
      code:              formatFeatureCode(r.codePrefix, r.codeSeq),
      name:              r.name,
      required:          r.required,
      position:          r.position,
      status:            latest?.status ?? null,
      latestExecutionId: latest?.executionId ?? null,
      runnable:          isRunnable(r.parseErrors, r.content, activeManualCount.get(r.featureId) ?? 0),
    };
  });

  return { campaign, members, progress };
}

type FeatureParseErrors = typeof features.$inferSelect['parseErrors'];

/**
 * Whether a feature can be run right now, mirroring `startExecution`:
 * no persisted parse errors, and at least one Gherkin or active manual scenario.
 */
function isRunnable(parseErrors: FeatureParseErrors, content: string, activeManualCount: number): boolean {
  if (parseErrors && parseErrors.length > 0) return false;
  return parse(content).scenarios.length > 0 || activeManualCount > 0;
}

/** Active (non-archived) manual-scenario count per feature, in one query, for the given feature ids. */
async function countActiveManualScenarios(featureIds: string[]): Promise<Map<string, number>> {
  if (featureIds.length === 0) return new Map();

  const rows = await db
    .select({ featureId: manualScenarios.featureId, count: sql<number>`count(*)::int` })
    .from(manualScenarios)
    .where(and(inArray(manualScenarios.featureId, featureIds), eq(manualScenarios.archived, false)))
    .groupBy(manualScenarios.featureId);

  return new Map(rows.map((r) => [r.featureId, r.count]));
}
