import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';

export const saveStepNoteInput = z.object({
  executionId:          z.uuid({ version: 'v7' }),
  scenarioResultStepId: z.uuid({ version: 'v7' }),
  note:                 z.string().nullable(),
});

export type SaveStepNoteInput = z.infer<typeof saveStepNoteInput>;

/**
 * Persists a free-form note on one step inside a RUNNING run. Empty or
 * whitespace-only notes normalise to NULL. Refuses to write into a finished run
 * or a step outside this run.
 */
export async function saveStepNote(input: SaveStepNoteInput) {
  const [run] = await db.select().from(executions).where(eq(executions.id, input.executionId));
  if (!run) throw new Error(`saveStepNote: run ${input.executionId} not found`);
  if (run.status !== 'IN_PROGRESS') throw new Error(`saveStepNote: run ${input.executionId} is not RUNNING`);

  const [scoped] = await db
    .select({ id: scenarioResultSteps.id })
    .from(scenarioResultSteps)
    .innerJoin(scenarioResults, eq(scenarioResults.id, scenarioResultSteps.scenarioResultId))
    .where(and(
      eq(scenarioResultSteps.id, input.scenarioResultStepId),
      eq(scenarioResults.executionId, input.executionId),
    ));
  if (!scoped) throw new Error(`saveStepNote: step ${input.scenarioResultStepId} not found in run ${input.executionId}`);

  const normalised = input.note && input.note.trim().length > 0 ? input.note : null;

  const [updated] = await db.update(scenarioResultSteps)
    .set({ note: normalised, updatedAt: new Date() })
    .where(eq(scenarioResultSteps.id, input.scenarioResultStepId))
    .returning();
  return updated;
}
