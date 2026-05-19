import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { featureGroups } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';

export const groupReorderInput = z.object({
  projectId:  z.uuid({ version: 'v7' }),
  orderedIds: z.array(z.uuid({ version: 'v7' })),
});
export type GroupReorderInput = z.infer<typeof groupReorderInput>;

export type ReorderGroupsError  = 'invalid-order';
export type ReorderGroupsResult = Result<null, ReorderGroupsError>;

/**
 * Rewrites every position for the project atomically. Last-writer-wins under
 * concurrent reorders — both clients converge on the latest state at next load.
 * Partial position updates are intentionally not supported: that's how drag
 * corruption ("two groups at position 3") happens.
 */
export async function reorderGroups(input: GroupReorderInput): Promise<ReorderGroupsResult> {
  return db.transaction(async (tx) => {
    const current = await tx
      .select({ id: featureGroups.id })
      .from(featureGroups)
      .where(eq(featureGroups.projectId, input.projectId));

    const currentIds  = new Set(current.map((g) => g.id));
    const orderedSet  = new Set(input.orderedIds);
    const sameSize    = currentIds.size === orderedSet.size;
    const sameMembers = sameSize && [...currentIds].every((id) => orderedSet.has(id));

    if (!sameMembers) return err('invalid-order');

    for (const [position, id] of input.orderedIds.entries()) {
      await tx.update(featureGroups)
        .set({ position, updatedAt: new Date() })
        .where(eq(featureGroups.id, id));
    }

    return ok(null);
  });
}
