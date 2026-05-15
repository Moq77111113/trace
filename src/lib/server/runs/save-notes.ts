import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { runs } from '$lib/server/db/schema';

export type SaveNotesInput = {
  runId: string;
  notes: string | null;
};

/**
 * Persists free-form run-level notes. Only writable while the run is RUNNING:
 * once finished, the snapshot is immutable. Empty string normalises to NULL.
 */
export async function saveNotes(input: SaveNotesInput) {
  const [run] = await db.select().from(runs).where(eq(runs.id, input.runId));
  if (!run) throw new Error(`saveNotes: run ${input.runId} not found`);
  if (run.status !== 'RUNNING') throw new Error(`saveNotes: run ${input.runId} is not RUNNING`);

  const normalised = input.notes && input.notes.trim().length > 0 ? input.notes : null;

  const [updated] = await db.update(runs)
    .set({ notes: normalised })
    .where(eq(runs.id, input.runId))
    .returning();

  if (!updated) throw new Error('saveNotes: update returned no row');

  return updated;
}
