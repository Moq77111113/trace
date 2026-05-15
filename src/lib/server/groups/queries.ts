import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { featureGroups } from '$lib/server/db/schema';

export type Group = typeof featureGroups.$inferSelect;

/** Returns all groups for a project ordered by position ascending. */
export async function listGroups(projectId: string): Promise<Group[]> {
  return db
    .select()
    .from(featureGroups)
    .where(eq(featureGroups.projectId, projectId))
    .orderBy(asc(featureGroups.position));
}
