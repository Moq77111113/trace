import { db } from '$lib/server/db/client';
import { executions, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { resolveFeature } from './matching/resolve-feature';
import { formatFeatureCode } from '$lib/shared/lib/slug';
import { formatTraceTag } from '$lib/features/feature-import/lib/trace-tag';
import { extractScenarioSteps } from '$lib/shared/gherkin/steps';
import type { IngestedFeatureRun, ScenarioStatus } from './cucumber-json/types';
import type { CiMetadata } from '$lib/entities/execution/lib/ci-metadata';
import type { ResolvedCampaign } from './resolve-campaign';

export type IngestedExecutionSummary = {
  featureCode:      string;
  executionId:      string;
  status:           ScenarioStatus;
  scenariosMatched: number;
  matchedVia:       'code' | 'gherkin-name' | 'name';
};

/** Per-run context shared by every feature's persistence step. */
export type IngestContext = {
  projectId:   string;
  codePrefix:  string;
  campaign:    ResolvedCampaign | null;
  executedBy:  string;
  environment: string | null;
  ciMetadata:  CiMetadata | null;
};

/** Result of persisting one parsed feature run: either no feature matched, or an execution was recorded. Carries the warnings raised along the way. */
export type FeatureRunOutcome =
  | { kind: 'unmatched'; featureName: string; warnings: string[] }
  | { kind: 'recorded';  summary: IngestedExecutionSummary; warnings: string[] };

type IngestTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Reduces scenario statuses to one rollup: FAILED wins, then PASSED, else SKIPPED. */
export function deriveFinalStatus(statuses: ScenarioStatus[]): ScenarioStatus {
  if (statuses.includes('FAILED')) return 'FAILED';
  if (statuses.includes('PASSED')) return 'PASSED';
  return 'SKIPPED';
}

/** Inserts the scenario rows for one execution, in payload order. No-op when the feature run carried no scenarios. */
async function insertScenarioResults(tx: IngestTx, executionId: string, featureContent: string, scenarios: IngestedFeatureRun['scenarios']) {
  if (!scenarios.length) return;

  const inserted = await tx.insert(scenarioResults).values(
    scenarios.map((s, i) => ({
      executionId,
      scenarioName: s.name,
      position:     i + 1,
      status:       s.status,
      durationMs:   s.durationMs,
      logs:         s.logs,
      errorMessage: s.errorMessage,
    })),
  ).returning({ id: scenarioResults.id });

  const stepRows = inserted.flatMap((sr, i) => {
    const s = scenarios[i];
    if (!s) return [];
    return extractScenarioSteps(featureContent, s.name).map((st, j) => ({
      scenarioResultId: sr.id,
      position:         j + 1,
      keyword:          st.keyword,
      text:             st.text,
      expected:         null,
      verdict:          s.status,
    }));
  });

  if (stepRows.length > 0) await tx.insert(scenarioResultSteps).values(stepRows);
}

/** Persists one parsed feature run: resolves the feature, tags the campaign when the feature is a member, writes the execution and its scenarios. */
export async function recordFeatureRun(tx: IngestTx, parsed: IngestedFeatureRun, ctx: IngestContext): Promise<FeatureRunOutcome> {
  const warnings = [...parsed.warnings];

  const matched = await resolveFeature(parsed, ctx.projectId);
  if (!matched.ok) {
    if (matched.error.code === 'MATCH_TAG_REFERENCES_MISSING_CODE') {
      const code = matched.error.tagCode ?? '<unknown>';
      warnings.push(`Feature tagged '${formatTraceTag(code)}' but no such code exists in project.`);
    }
    return { kind: 'unmatched', featureName: parsed.featureName, warnings };
  }

  const { feature, via } = matched.value;
  const status = deriveFinalStatus(parsed.scenarios.map((s) => s.status));

  let campaignId: string | null = null;
  if (ctx.campaign) {
    if (ctx.campaign.members.has(feature.id)) campaignId = ctx.campaign.id;
    else warnings.push(`Feature '${parsed.featureName}' is not a campaign member; ingested untagged.`);
  }

  const now = new Date();
  const [execution] = await tx.insert(executions).values({
    featureId:             feature.id,
    source:                'CI',
    executedBy:            ctx.executedBy,
    environment:           ctx.environment,
    ciMetadata:            ctx.ciMetadata,
    campaignId,
    featureContentAtStart: feature.content,
    status,
    startedAt:             now,
    finishedAt:            now,
  }).returning();
  if (!execution) throw new Error('ingestRun: execution insert returned no row');

  await insertScenarioResults(tx, execution.id, feature.content, parsed.scenarios);

  const featureCode = formatFeatureCode(ctx.codePrefix, feature.codeSeq);
  if (via !== 'code') {
    warnings.push(`Feature '${parsed.featureName}' matched by name; add '${formatTraceTag(featureCode)}' to the Gherkin for stable matching.`);
  }

  return {
    kind:    'recorded',
    summary: { featureCode, executionId: execution.id, status, scenariosMatched: parsed.scenarios.length, matchedVia: via },
    warnings,
  };
}
