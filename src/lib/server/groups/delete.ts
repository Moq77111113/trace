import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { featureGroups, features } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';

export const groupDeleteInput = z.object({
  groupId: z.uuid({ version: 'v7' }),
});
export type GroupDeleteInput = z.infer<typeof groupDeleteInput>;

export type DeleteGroupError  = 'not-found';
export type DeleteGroupResult = Result<{ affectedFeatureCount: number }, DeleteGroupError>;

/**
 * The DB enforces ON DELETE SET NULL on features.group_id, so the row count
 * we measure here is the same set that will be reset. We capture it in the
 * same transaction so the UI can announce "N features moved to ungrouped".
 */
export async function deleteGroup(input: GroupDeleteInput): Promise<DeleteGroupResult> {
  return db.transaction(async (tx) => {
    const affected = await tx
      .select({ id: features.id })
      .from(features)
      .where(eq(features.groupId, input.groupId));

    const deleted = await tx
      .delete(featureGroups)
      .where(eq(featureGroups.id, input.groupId))
      .returning({ id: featureGroups.id });

    if (deleted.length === 0) return err('not-found');
    return ok({ affectedFeatureCount: affected.length });
  });
}
