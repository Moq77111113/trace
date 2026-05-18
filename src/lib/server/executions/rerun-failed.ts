import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';

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
 * Snapshot semantics: the new run's `featureContentAtStart` is copied from the
 * parent, so edits to the source feature after the parent finished do not
 * affect this re-run. The QA re-tests the scenarios as they were when they
 * failed; a fresh run is the right tool for newer content.
 */
export async function rerunFailed(input: RerunFailedInput): Promise<RerunFailedResult> {
  const [parent] = await db.select().from(executions).where(eq(executions.id, input.parentExecutionId));
  if (!parent) return err('parent-not-found');
  if (parent.status === 'IN_PROGRESS') return err('parent-in-progress');

  const failed = await db
    .select({ scenarioName: scenarioResults.scenarioName })
    .from(scenarioResults)
    .where(and(eq(scenarioResults.executionId, parent.id), eq(scenarioResults.status, 'FAILED')));

  if (failed.length === 0) return err('no-failed-scenarios');

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

    await tx.insert(scenarioResults).values(
      failed.map((f) => ({
        executionId:  execution.id,
        scenarioName: f.scenarioName,
      })),
    );

    return execution;
  });

  return ok(created);
}
