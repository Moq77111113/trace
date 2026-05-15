import { db } from '$lib/server/db/client';
import { featureGroups } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Group } from './queries';

export const groupCreateInput = z.object({
  projectId: z.uuid({version: 'v7'}),
  name:      z.string().trim().min(1).max(80),
});
export type GroupCreateInput = z.infer<typeof groupCreateInput>;

export type CreateGroupResult = Group | { error: 'duplicate-name' };

/** Inserts a new group at the next position for the project. */
export async function createGroup(input: GroupCreateInput): Promise<CreateGroupResult> {
  try {
    const [row] = await db.insert(featureGroups)
      .values({
        projectId: input.projectId,
        name:      input.name.trim(),
        position:  sql`COALESCE((SELECT MAX(position) FROM ${featureGroups} WHERE project_id = ${input.projectId}), -1) + 1`,
      })
      .returning();
    if (!row) throw new Error('createGroup: insert returned no row');
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
