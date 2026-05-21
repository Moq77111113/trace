import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults } from '$lib/server/db/schema';

type FinalStatus = 'PASSED' | 'FAILED' | 'SKIPPED';
type ScenarioStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';

function deriveFinalStatus(statuses: ScenarioStatus[]): FinalStatus {
  if (statuses.includes('FAILED')) return 'FAILED';
  if (statuses.includes('PASSED')) return 'PASSED';
  return 'SKIPPED';
}

/**
 * Transitions a RUNNING run to its terminal state. Coerces leftover PENDING
 * scenarios to SKIPPED before deriving the final status. Idempotent: re-runs
 * on an already-finished run are a no-op and return the existing row.
 */
export async function finishExecution(executionId: string) {
  return db.transaction(async (tx) => {
    const [run] = await tx.select().from(executions).where(eq(executions.id, executionId));
    if (!run) throw new Error(`finishExecution: run ${executionId} not found`);
    if (run.status !== 'IN_PROGRESS') return run;

    await tx.update(scenarioResults)
      .set({ status: 'SKIPPED', updatedAt: new Date() })
      .where(and(eq(scenarioResults.executionId, executionId), eq(scenarioResults.status, 'PENDING')));

    const rows = await tx.select({ status: scenarioResults.status })
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, executionId));

    const finalStatus = deriveFinalStatus(rows.map((r) => r.status));

    const [updated] = await tx.update(executions)
      .set({ status: finalStatus, finishedAt: new Date() })
      .where(eq(executions.id, executionId))
      .returning();
    if (!updated) throw new Error(`finishExecution: update returned no row for ${executionId}`);

    return updated;
  });
}
