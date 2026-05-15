import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { runs, scenarioResults } from '$lib/server/db/schema';

export type ScenarioStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

export type MarkScenarioInput = {
  runId:            string;
  scenarioResultId: string;
  status:           ScenarioStatus;
  durationMs?:      number | undefined;
  logs?:            string | null | undefined;
  errorMessage?:    string | null | undefined;
};

/**
 * Persists a P/F/S verdict for one scenario inside a RUNNING run.
 * Refuses to write into a finished run (the snapshot is locked once finishRun()
 * has transitioned the row). Refuses if the scenario doesn't belong to this run
 * (defence in depth: the route already scopes by `:rid/:sid`).
 */
export async function markScenario(input: MarkScenarioInput) {
  const [run] = await db.select().from(runs).where(eq(runs.id, input.runId));
  if (!run) throw new Error(`markScenario: run ${input.runId} not found`);
  if (run.status !== 'RUNNING') throw new Error(`markScenario: run ${input.runId} is not RUNNING`);

  const [updated] = await db.update(scenarioResults)
    .set({
      status:       input.status,
      durationMs:   input.durationMs   ?? null,
      logs:         input.logs         ?? null,
      errorMessage: input.errorMessage ?? null,
      updatedAt:    new Date(),
    })
    .where(and(
      eq(scenarioResults.id, input.scenarioResultId),
      eq(scenarioResults.runId, input.runId),
    ))
    .returning();

  if (!updated) throw new Error(`markScenario: scenario ${input.scenarioResultId} not found in run ${input.runId}`);

  return updated;
}
