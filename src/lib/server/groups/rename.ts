import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { featureGroups } from '$lib/server/db/schema';
import type { Group } from './queries';

export const groupRenameInput = z.object({
  groupId: z.uuid({version: 'v7'}),
  name:    z.string().trim().min(1).max(80),
});
export type GroupRenameInput = z.infer<typeof groupRenameInput>;

export type RenameGroupResult = Group | { error: 'duplicate-name' } | { error: 'not-found' };

/** Renames an existing group, enforcing the per-project unique-name constraint. */
export async function renameGroup(input: GroupRenameInput): Promise<RenameGroupResult> {
  try {
    const [row] = await db.update(featureGroups)
      .set({ name: input.name.trim(), updatedAt: new Date() })
      .where(eq(featureGroups.id, input.groupId))
      .returning();
    if (!row) return { error: 'not-found' };
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) return { error: 'duplicate-name' };
    throw e;
  }
}

function isUniqueViolation(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  // Drizzle wraps PostgresError in a generic Error via `cause`
  const target = 'cause' in e ? (e as { cause: unknown }).cause : e;
  return typeof target === 'object' && target !== null && 'code' in target && (target as { code: unknown }).code === '23505';
}
