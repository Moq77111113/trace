import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';
import { resolveCampaign } from './resolve-campaign';
import { recordFeatureRun, deriveFinalStatus, type IngestContext, type IngestedExecutionSummary } from './record-feature-run';
import type { IngestedFeatureRun, ScenarioStatus } from './cucumber-json/types';
import type { CiMetadata } from '$lib/entities/execution/lib/ci-metadata';

export type IngestRunInput = {
  projectId:    string;
  executedBy:   string;
  environment?: string | null;
  ciMetadata?:  CiMetadata | null;
  parsed:       IngestedFeatureRun[];
};

export type IngestRunResult = {
  status:          ScenarioStatus;
  executions:      IngestedExecutionSummary[];
  unknownFeatures: string[];
  warnings:        string[];
};

export type IngestRunErrorCode = 'INGEST_NO_FEATURES_MATCHED';
export type IngestRunError     = { code: IngestRunErrorCode; detail: string };

/** Loads the ingesting project's code prefix; throws if the project is gone. */
async function requireProject(projectId: string): Promise<{ codePrefix: string }> {
  const [projectRow] = await db.select({ codePrefix: projects.codePrefix }).from(projects).where(eq(projects.id, projectId));
  if (!projectRow) throw new Error(`ingestRun: project ${projectId} not found`);
  return projectRow;
}

/** Ingests a parsed CI run: attributes executions to a campaign by app version, persists one execution per matched feature, and reports per-feature outcomes and warnings. */
export async function ingestRun(input: IngestRunInput): Promise<Result<IngestRunResult, IngestRunError>> {
  const { codePrefix } = await requireProject(input.projectId);
  const { campaign, warnings: campaignWarnings } = await resolveCampaign(input.projectId, input.ciMetadata?.appVersion);

  const ctx = {
    projectId:   input.projectId,
    codePrefix,
    campaign,
    executedBy:  input.executedBy,
    environment: input.environment ?? null,
    ciMetadata:  input.ciMetadata ?? null,
  } satisfies IngestContext;

  return db.transaction(async (tx) => {
    const summaries:       IngestedExecutionSummary[] = [];
    const unknownFeatures: string[] = [];
    const warnings:        string[] = [...campaignWarnings];

    for (const parsed of input.parsed) {
      const outcome = await recordFeatureRun(tx, parsed, ctx);
      warnings.push(...outcome.warnings);
      if (outcome.kind === 'unmatched') unknownFeatures.push(outcome.featureName);
      else summaries.push(outcome.summary);
    }

    if (summaries.length === 0) {
      return err({ code: 'INGEST_NO_FEATURES_MATCHED', detail: `no feature matched: ${unknownFeatures.join(', ')}` });
    }

    return ok({
      status:          deriveFinalStatus(summaries.map((s) => s.status)),
      executions:      summaries,
      unknownFeatures,
      warnings,
    });
  });
}
