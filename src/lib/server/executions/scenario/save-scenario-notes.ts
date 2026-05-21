import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults } from '$lib/server/db/schema';

export type SaveScenarioNotesInput = {
  executionId:      string;
  scenarioResultId: string;
  notes:            string | null;
};

/**
 * Persists free-form notes on one scenario inside a RUNNING run.
 * Refuses to write into a finished run (the snapshot is locked once finishExecution()
 * has transitioned the row). Refuses if the scenario doesn't belong to this run.
 * Empty / whitespace-only notes normalise to NULL.
 */
export async function saveScenarioNotes(input: SaveScenarioNotesInput) {
  const [run] = await db.select().from(executions).where(eq(executions.id, input.executionId));
  if (!run) throw new Error(`saveScenarioNotes: run ${input.executionId} not found`);
  if (run.status !== 'IN_PROGRESS') throw new Error(`saveScenarioNotes: run ${input.executionId} is not RUNNING`);

  const normalised = input.notes && input.notes.trim().length > 0 ? input.notes : null;

  const [updated] = await db.update(scenarioResults)
    .set({ notes: normalised, updatedAt: new Date() })
    .where(and(
      eq(scenarioResults.id, input.scenarioResultId),
      eq(scenarioResults.executionId, input.executionId),
    ))
    .returning();

  if (!updated) throw new Error(`saveScenarioNotes: scenario ${input.scenarioResultId} not found in run ${input.executionId}`);

  return updated;
}
