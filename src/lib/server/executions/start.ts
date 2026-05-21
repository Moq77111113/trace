import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, features, scenarioResults } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';

export type StartRunInput = {
  featureId:    string;
  executedBy:   string;
  environment?: string | null;
};

/**
 * Creates a RUNNING run as an immutable snapshot of the feature at this moment.
 * Eagerly inserts one `scenarioResults` row per parsed scenario so the live-run
 * UI has no drift between its iteration and what the DB knows about.
 *
 * Rejects features with persisted parse errors and features with zero scenarios
 * — both are non-runnable per spec.
 */
export async function startExecution(input: StartRunInput) {
  const [feature] = await db.select().from(features).where(eq(features.id, input.featureId));
  if (!feature) throw new Error(`startExecution: feature ${input.featureId} not found`);

  if (feature.parseErrors && feature.parseErrors.length > 0) {
    throw new Error('startExecution: cannot start — feature has parse errors');
  }

  const parsed = parse(feature.content);
  if (parsed.scenarios.length === 0) {
    throw new Error('startExecution: cannot start — feature has no scenarios');
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

    await tx.insert(scenarioResults).values(
      parsed.scenarios.map((s) => ({
        executionId:        run.id,
        scenarioName: s.name,
      })),
    );

    return run;
  });
}
