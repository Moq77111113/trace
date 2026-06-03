import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';
import { buildScenarioRows, buildStepRows, type FrozenStep } from './scenario-rows';

export type RerunFailedInput = {
  parentExecutionId: string;
  executedBy:  string;
};

export type RerunFailedError  = 'parent-not-found' | 'parent-in-progress' | 'no-failed-scenarios';
export type RerunFailedResult = Result<typeof executions.$inferSelect, RerunFailedError>;

/**
 * Starts a new run that re-executes only the FAILED scenarios from a finished
 * parent run, against the parent's frozen feature snapshot.
 *
 * Each failed scenario's `source` (GHERKIN or MANUAL) is carried over, and
 * `position` is renumbered from 1 within each source section so the unique
 * constraint (executionId, source, position) is satisfied.
 *
 * Snapshot semantics: the new run's `featureContentAtStart` is copied from the
 * parent, so edits to the source feature after the parent finished do not
 * affect this re-run.
 */
export async function rerunFailed(input: RerunFailedInput): Promise<RerunFailedResult> {
  const [parent] = await db.select().from(executions).where(eq(executions.id, input.parentExecutionId));
  if (!parent) return err('parent-not-found');
  if (parent.status === 'IN_PROGRESS') return err('parent-in-progress');

  const failed = await db
    .select({ id: scenarioResults.id, scenarioName: scenarioResults.scenarioName, source: scenarioResults.source })
    .from(scenarioResults)
    .where(and(eq(scenarioResults.executionId, parent.id), eq(scenarioResults.status, 'FAILED')))
    .orderBy(asc(scenarioResults.source), asc(scenarioResults.position));

  if (failed.length === 0) return err('no-failed-scenarios');

  const stepsByScenario = new Map<string, FrozenStep[]>();
  for (const f of failed) {
    const st = await db.select({ keyword: scenarioResultSteps.keyword, text: scenarioResultSteps.text, expected: scenarioResultSteps.expected })
      .from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.scenarioResultId, f.id))
      .orderBy(asc(scenarioResultSteps.position));
    stepsByScenario.set(f.id, st);
  }

  const rows = buildScenarioRows(failed.map((f) => ({
    scenarioName: f.scenarioName,
    source:       f.source,
    steps:        stepsByScenario.get(f.id) ?? [],
  })));

  const created = await db.transaction(async (tx) => {
    const [execution] = await tx
      .insert(executions)
      .values({
        featureId:             parent.featureId,
        source:                'MANUAL',
        executedBy:            input.executedBy,
        environment:           parent.environment,
        featureContentAtStart: parent.featureContentAtStart,
      })
      .returning();
    if (!execution) throw new Error('rerunFailed: execution insert returned no row');

    const inserted = await tx.insert(scenarioResults)
      .values(rows.map((r) => ({ scenarioName: r.scenarioName, source: r.source, position: r.position, executionId: execution.id })))
      .returning({ id: scenarioResults.id });

    const stepRows = rows.flatMap((r, i) => {
      const sr = inserted[i];
      if (!sr) throw new Error('rerunFailed: scenario result insert/return mismatch');
      return buildStepRows(sr.id, r.steps);
    });
    if (stepRows.length > 0) await tx.insert(scenarioResultSteps).values(stepRows);

    return execution;
  });

  return ok(created);
}
