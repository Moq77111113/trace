import { db } from '$lib/server/db/client';
import { executions, scenarioResults, projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err, type Result } from '$lib/shared/lib/result';
import { resolveFeature } from './matching/resolve-feature';
import { formatFeatureCode } from '$lib/shared/lib/slug';
import { formatTraceTag } from '$lib/features/feature-import/lib/trace-tag';
import type { IngestedFeatureRun, ScenarioStatus } from './cucumber-json/types';
import type { CiMetadata } from '$lib/entities/execution/lib/ci-metadata';

export type IngestRunInput = {
  projectId:    string;
  executedBy:   string;
  environment?: string | null;
  ciMetadata?:  CiMetadata | null;
  parsed:       IngestedFeatureRun[];
};

export type IngestedExecutionSummary = {
  featureCode:      string;
  executionId:      string;
  status:           ScenarioStatus;
  scenariosMatched: number;
  matchedVia:       'code' | 'gherkin-name' | 'name';
};

export type IngestRunResult = {
  status:          ScenarioStatus;
  executions:      IngestedExecutionSummary[];
  unknownFeatures: string[];
  warnings:        string[];
};

export type IngestRunErrorCode = 'INGEST_NO_FEATURES_MATCHED';
export type IngestRunError     = { code: IngestRunErrorCode; detail: string };

function deriveFinalStatus(statuses: ScenarioStatus[]): ScenarioStatus {
  if (statuses.includes('FAILED')) return 'FAILED';
  if (statuses.includes('PASSED')) return 'PASSED';
  return 'SKIPPED';
}

export async function ingestRun(input: IngestRunInput): Promise<Result<IngestRunResult, IngestRunError>> {
  const [projectRow] = await db.select({ codePrefix: projects.codePrefix }).from(projects).where(eq(projects.id, input.projectId));
  if (!projectRow) throw new Error(`ingestRun: project ${input.projectId} not found`);

  const summaries:       IngestedExecutionSummary[] = [];
  const unknownFeatures: string[] = [];
  const warnings:        string[] = [];

  return db.transaction(async (tx) => {
    for (const parsed of input.parsed) {
      warnings.push(...parsed.warnings);

      const matched = await resolveFeature(parsed, input.projectId);
      if (!matched.ok) {
        unknownFeatures.push(parsed.featureName);
        if (matched.error.code === 'MATCH_TAG_REFERENCES_MISSING_CODE') {
          const code = matched.error.tagCode ?? '<unknown>';
          warnings.push(`Feature tagged '${formatTraceTag(code)}' but no such code exists in project.`);
        }
        continue;
      }

      const { feature, via } = matched.value;
      const status = deriveFinalStatus(parsed.scenarios.map((s) => s.status));
      const now    = new Date();

      const [execution] = await tx.insert(executions).values({
        featureId:             feature.id,
        source:                'CI',
        executedBy:            input.executedBy,
        environment:           input.environment ?? null,
        ciMetadata:            input.ciMetadata ?? null,
        featureContentAtStart: feature.content,
        status,
        startedAt:             now,
        finishedAt:            now,
      }).returning();
      if (!execution) throw new Error('ingestRun: execution insert returned no row');

      if (parsed.scenarios.length) {
        await tx.insert(scenarioResults).values(
          parsed.scenarios.map((s, i) => ({
            executionId:  execution.id,
            scenarioName: s.name,
            position:     i + 1,
            status:       s.status,
            durationMs:   s.durationMs,
            logs:         s.logs,
            errorMessage: s.errorMessage,
          })),
        );
      }

      const featureCode = formatFeatureCode(projectRow.codePrefix, feature.codeSeq);
      summaries.push({
        featureCode,
        executionId:      execution.id,
        status,
        scenariosMatched: parsed.scenarios.length,
        matchedVia:       via,
      });

      if (via !== 'code') {
        warnings.push(`Feature '${parsed.featureName}' matched by name; add '${formatTraceTag(featureCode)}' to the Gherkin for stable matching.`);
      }
    }

    if (summaries.length === 0) {
      return err({ code: 'INGEST_NO_FEATURES_MATCHED', detail: `no feature matched: ${unknownFeatures.join(', ')}` });
    }

    return ok({
      status: deriveFinalStatus(summaries.map((s) => s.status)),
      executions:      summaries,
      unknownFeatures,
      warnings,
    });
  });
}
