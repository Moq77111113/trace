import { asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaignFeatures, executions, executionStatus } from '$lib/server/db/schema';

/** The campaign's verdict: PASSED/FAILED over its required members, or INCONCLUSIVE when none are required. */
export type CampaignOutcome = 'PASSED' | 'FAILED' | 'INCONCLUSIVE';

/** The latest tagged execution status of a member feature, or `null` when never run under the campaign. */
export type MemberStatus = (typeof executionStatus.enumValues)[number] | null;

/** A member feature's standing within the campaign. */
export type MemberProgress = { featureId: string; required: boolean; status: MemberStatus };

/** Live progress for a campaign: per-member standing, count buckets, and the pass/fail verdict. */
export type CampaignProgress = {
  members:        MemberProgress[];
  requiredTotal:  number;
  requiredPassed: number;
  requiredFailed: number;
  requiredNotRun: number;
  optionalTotal:  number;
  optionalPassed: number;
  executed:       number;
  outcome:        CampaignOutcome;
};

/** Computes campaign progress from the latest tagged execution per member feature. */
export async function computeProgress(campaignId: string): Promise<CampaignProgress> {
  const ranked = db.$with('ranked_tagged').as(
    db
      .select({
        featureId: executions.featureId,
        status:    executions.status,
        rn:        sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${executions.featureId}
          ORDER BY ${executions.startedAt} DESC, ${executions.id} DESC
        )`.as('rn'),
      })
      .from(executions)
      .where(eq(executions.campaignId, campaignId)),
  );

  const latest = await db
    .with(ranked)
    .select({ featureId: ranked.featureId, status: ranked.status })
    .from(ranked)
    .where(eq(ranked.rn, 1));

  const members = await db
    .select({ featureId: campaignFeatures.featureId, required: campaignFeatures.required })
    .from(campaignFeatures)
    .where(eq(campaignFeatures.campaignId, campaignId))
    .orderBy(asc(campaignFeatures.position));

  const statusByFeature = new Map(latest.map((r) => [r.featureId, r.status]));

  const progress: MemberProgress[] = members.map((m) => ({
    featureId: m.featureId,
    required:  m.required,
    status:    statusByFeature.get(m.featureId) ?? null,
  }));

  const required = progress.filter((m) => m.required);
  const optional = progress.filter((m) => !m.required);

  const requiredPassed = required.filter((m) => m.status === 'PASSED').length;
  const requiredNotRun = required.filter((m) => m.status === null).length;

  let outcome: CampaignOutcome = 'INCONCLUSIVE';
  if (required.length > 0) {
    outcome = required.every((m) => m.status === 'PASSED') ? 'PASSED' : 'FAILED';
  }

  return {
    members:        progress,
    requiredTotal:  required.length,
    requiredPassed,
    requiredFailed: required.length - requiredPassed - requiredNotRun,
    requiredNotRun,
    optionalTotal:  optional.length,
    optionalPassed: optional.filter((m) => m.status === 'PASSED').length,
    executed:       progress.filter((m) => m.status !== null).length,
    outcome,
  };
}
