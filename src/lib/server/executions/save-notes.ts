import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';

export type SaveNotesInput = {
  executionId: string;
  notes: string | null;
};

/**
 * Persists free-form run-level notes. Only writable while the run is RUNNING:
 * once finished, the snapshot is immutable. Empty string normalises to NULL.
 */
export async function saveNotes(input: SaveNotesInput) {
  const [run] = await db.select().from(executions).where(eq(executions.id, input.executionId));
  if (!run) throw new Error(`saveNotes: run ${input.executionId} not found`);
  if (run.status !== 'IN_PROGRESS') throw new Error(`saveNotes: run ${input.executionId} is not RUNNING`);

  const normalised = input.notes && input.notes.trim().length > 0 ? input.notes : null;

  const [updated] = await db.update(executions)
    .set({ notes: normalised })
    .where(eq(executions.id, input.executionId))
    .returning();

  if (!updated) throw new Error('saveNotes: update returned no row');

  return updated;
}
