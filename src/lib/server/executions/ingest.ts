import { db } from '$lib/server/db/client';
import { executions, features, scenarioResults } from '$lib/server/db/schema';
import type { IngestedExecution } from './cucumber-json/types';
import type { CiMetadata } from '$lib/entities/execution/lib/ci-metadata';
import type { InferSelectModel } from 'drizzle-orm';
import { and, eq, sql } from 'drizzle-orm';

export type IngestExecutionInput = {
  projectId:    string;
  executedBy:   string;
  environment?: string | null;
  ciMetadata?:  CiMetadata | null;
  parsed:       IngestedExecution;
};

export type IngestExecutionResult = {
  execution:        InferSelectModel<typeof executions>;
  scenariosMatched: number;
  scenariosUnknown: number;
  warnings:         string[];
};

type ScenarioStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

function deriveFinalStatus(statuses: ScenarioStatus[]): ScenarioStatus {
  if (statuses.includes('FAILED')) return 'FAILED';
  if (statuses.includes('PASSED')) return 'PASSED';

  return 'SKIPPED';
}

/**
 * CI counterpart to `startExecution`. Matches a feature within the project by
 * case-insensitive name, snapshots `features.content` at request time, and
 * writes one finished `runs` row plus N `scenario_results` in a single
 * transaction. The final status is derived the same way as `finishExecution`.
 */
export async function ingestExecution(input: IngestExecutionInput): Promise<IngestExecutionResult> {
  const [feature] = await db
    .select()
    .from(features)
    .where(and(
      eq(features.projectId, input.projectId),
      sql`LOWER(${features.name}) = LOWER(${input.parsed.featureName})`,
    ));

  if (!feature) {
    throw new Error(`ingest: no feature matching "${input.parsed.featureName}" in project ${input.projectId}`);
  }

  const finalStatus = deriveFinalStatus(input.parsed.scenarios.map((s) => s.status));
  const now         = new Date();

  return db.transaction(async (tx) => {
    const [execution] = await tx
      .insert(executions)
      .values({
        featureId:             feature.id,
        source:                'CI',
        executedBy:            input.executedBy,
        environment:           input.environment ?? null,
        ciMetadata:            input.ciMetadata ?? null,
        featureContentAtStart: feature.content,
        status:                finalStatus,
        startedAt:             now,
        finishedAt:            now,
      })
      .returning();
    if (!execution) throw new Error('ingest: execution insert returned no row');

    if (input.parsed.scenarios.length) {
      await tx.insert(scenarioResults).values(
        input.parsed.scenarios.map((s) => ({
          executionId:  execution.id,
          scenarioName: s.name,
          status:       s.status,
          durationMs:   s.durationMs,
          logs:         s.logs,
          errorMessage: s.errorMessage,
        })),
      );
    }

    return {
      execution,
      scenariosMatched: input.parsed.scenarios.length,
      scenariosUnknown: input.parsed.unknownCount,
      warnings:         input.parsed.warnings,
    };
  });
}
