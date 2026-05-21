import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults } from '$lib/server/db/schema';

/**
 * Transitions an IN_PROGRESS run to ABORTED. Cascades every PENDING scenario
 * to SKIPPED in a single UPDATE so the row count stays O(1) regardless of
 * scenario fan-out. Refuses on any non-IN_PROGRESS run (409 at the route).
 *
 * SELECT FOR UPDATE locks the run row for the duration of the cascade so a
 * concurrent cucumber-json ingest cannot flip the same scenarios after we
 * skipped them.
 */
export async function abortExecution(executionId: string) {
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(executions)
      .where(eq(executions.id, executionId))
      .for('update');

    if (!run) throw new Error(`abortExecution: run ${executionId} not found`);
    if (run.status !== 'IN_PROGRESS') throw new Error(`abortExecution: run ${executionId} is not RUNNING`);

    await tx
      .update(scenarioResults)
      .set({ status: 'SKIPPED', updatedAt: new Date() })
      .where(and(eq(scenarioResults.executionId, executionId), eq(scenarioResults.status, 'PENDING')));

    const [updated] = await tx
      .update(executions)
      .set({ status: 'ABORTED', finishedAt: sql`NOW()` })
      .where(eq(executions.id, executionId))
      .returning();

    if (!updated) throw new Error(`abortExecution: update returned no row for ${executionId}`);

    return updated;
  });
}
