import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults } from '$lib/server/db/schema';

export type ScenarioStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

export type MarkScenarioInput = {
  executionId:            string;
  scenarioResultId: string;
  status:           ScenarioStatus;
  durationMs?:      number | undefined;
  logs?:            string | null | undefined;
  errorMessage?:    string | null | undefined;
};

/**
 * Persists a P/F/S verdict for one scenario inside a RUNNING run.
 * Refuses to write into a finished run (the snapshot is locked once finishExecution()
 * has transitioned the row). Refuses if the scenario doesn't belong to this run
 * (defence in depth: the route already scopes by `:rid/:sid`).
 */
export async function markScenario(input: MarkScenarioInput) {
  const [run] = await db.select().from(executions).where(eq(executions.id, input.executionId));
  if (!run) throw new Error(`markScenario: run ${input.executionId} not found`);
  if (run.status !== 'IN_PROGRESS') throw new Error(`markScenario: run ${input.executionId} is not RUNNING`);

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
      eq(scenarioResults.executionId, input.executionId),
    ))
    .returning();

  if (!updated) throw new Error(`markScenario: scenario ${input.scenarioResultId} not found in run ${input.executionId}`);

  return updated;
}
