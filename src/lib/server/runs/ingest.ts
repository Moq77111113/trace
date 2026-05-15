import { db } from '$lib/server/db/client';
import { features, runs, scenarioResults } from '$lib/server/db/schema';
import type { IngestedRun } from './cucumber-json/types';
import type { InferSelectModel } from 'drizzle-orm';
import { and, eq, sql } from 'drizzle-orm';

export type IngestRunInput = {
  projectId:    string;
  executedBy:   string;
  environment?: string | null;
  parsed:       IngestedRun;
};

export type IngestRunResult = {
  run:              InferSelectModel<typeof runs>;
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
 * CI counterpart to `startRun`. Matches a feature within the project by
 * case-insensitive name, snapshots `features.content` at request time, and
 * writes one finished `runs` row plus N `scenario_results` in a single
 * transaction. The final status is derived the same way as `finishRun`.
 */
export async function ingestRun(input: IngestRunInput): Promise<IngestRunResult> {
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
    const [run] = await tx
      .insert(runs)
      .values({
        featureId:           feature.id,
        source:              'CI',
        executedBy:          input.executedBy,
        environment:         input.environment ?? null,
        featureContentAtRun: feature.content,
        status:              finalStatus,
        startedAt:           now,
        finishedAt:          now,
      })
      .returning();
    if (!run) throw new Error('ingest: run insert returned no row');

    if (input.parsed.scenarios.length) {
      await tx.insert(scenarioResults).values(
        input.parsed.scenarios.map((s) => ({
          runId:        run.id,
          scenarioName: s.name,
          status:       s.status,
          durationMs:   s.durationMs,
          logs:         s.logs,
          errorMessage: s.errorMessage,
        })),
      );
    }

    return {
      run,
      scenariosMatched: input.parsed.scenarios.length,
      scenariosUnknown: input.parsed.unknownCount,
      warnings:         input.parsed.warnings,
    };
  });
}
