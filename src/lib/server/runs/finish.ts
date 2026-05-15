import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { runs, scenarioResults } from '$lib/server/db/schema';

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
export async function finishRun(runId: string) {
  return db.transaction(async (tx) => {
    const [run] = await tx.select().from(runs).where(eq(runs.id, runId));
    if (!run) throw new Error(`finishRun: run ${runId} not found`);
    if (run.status !== 'RUNNING') return run;

    await tx.update(scenarioResults)
      .set({ status: 'SKIPPED', updatedAt: new Date() })
      .where(and(eq(scenarioResults.runId, runId), eq(scenarioResults.status, 'PENDING')));

    const rows = await tx.select({ status: scenarioResults.status })
      .from(scenarioResults)
      .where(eq(scenarioResults.runId, runId));

    const finalStatus = deriveFinalStatus(rows.map((r) => r.status));

    const [updated] = await tx.update(runs)
      .set({ status: finalStatus, finishedAt: new Date() })
      .where(eq(runs.id, runId))
      .returning();
    if (!updated) throw new Error(`finishRun: update returned no row for ${runId}`);

    return updated;
  });
}
