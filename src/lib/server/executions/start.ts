import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, features, scenarioResults } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import { listManualScenarios } from '$lib/server/features/manual-scenarios';

export type StartRunInput = {
  featureId:    string;
  executedBy:   string;
  environment?: string | null;
};

/**
 * Creates a run as an immutable snapshot of the feature at this moment.
 * Inserts one `scenario_results` row per Gherkin scenario (source=GHERKIN) and one
 * per active manual scenario (source=MANUAL), each with a within-source position
 * starting at 1. Archived manual scenarios are excluded. Positions are densified
 * so gaps from archiving do not appear in the snapshot.
 *
 * Rejects features with persisted parse errors, or when neither Gherkin nor
 * active manual scenarios exist (nothing to run).
 */
export async function startExecution(input: StartRunInput) {
  const [feature] = await db.select().from(features).where(eq(features.id, input.featureId));
  if (!feature) throw new Error(`startExecution: feature ${input.featureId} not found`);

  if (feature.parseErrors && feature.parseErrors.length > 0) {
    throw new Error('startExecution: cannot start, feature has parse errors');
  }

  const parsed  = parse(feature.content);
  const manuals = await listManualScenarios({ featureId: feature.id });

  if (parsed.scenarios.length === 0 && manuals.length === 0) {
    throw new Error('startExecution: cannot start, feature has no runnable scenarios');
  }

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(executions)
      .values({
        featureId:             feature.id,
        source:                'MANUAL',
        executedBy:            input.executedBy,
        environment:           input.environment ?? null,
        featureContentAtStart: feature.content,
      })
      .returning();
    if (!run) throw new Error('startExecution: run insert returned no row');

    const rows = [
      ...parsed.scenarios.map((s, i) => ({
        executionId:  run.id,
        scenarioName: s.name,
        source:       'GHERKIN' as const,
        position:     i + 1,
      })),
      ...manuals.map((m, i) => ({
        executionId:  run.id,
        scenarioName: m.name,
        source:       'MANUAL' as const,
        position:     i + 1,
      })),
    ];

    await tx.insert(scenarioResults).values(rows);
    return run;
  });
}
