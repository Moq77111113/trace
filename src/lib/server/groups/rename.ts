import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { featureGroups } from '$lib/server/db/schema';
import { isUniqueViolation } from '$lib/server/db/errors';
import { ok, err, type Result } from '$lib/shared/lib/result';
import type { Group } from './queries';

export const groupRenameInput = z.object({
  groupId: z.uuid({version: 'v7'}),
  name:    z.string().trim().min(1).max(80),
});
export type GroupRenameInput = z.infer<typeof groupRenameInput>;

export type RenameGroupError  = 'duplicate-name' | 'not-found';
export type RenameGroupResult = Result<Group, RenameGroupError>;

/** Renames an existing group, enforcing the per-project unique-name constraint. */
export async function renameGroup(input: GroupRenameInput): Promise<RenameGroupResult> {
  try {
    const [row] = await db.update(featureGroups)
      .set({ name: input.name.trim(), updatedAt: new Date() })
      .where(eq(featureGroups.id, input.groupId))
      .returning();
    if (!row) return err('not-found');
    return ok(row);
  } catch (e) {
    if (isUniqueViolation(e)) return err('duplicate-name');
    throw e;
  }
}
