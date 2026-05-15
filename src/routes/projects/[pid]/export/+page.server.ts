import { and, count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { projectArchiveFilename } from '$lib/import/format';
import type { PageServerLoad } from './$types';

export const load = (async ({ parent }) => {
  const { project } = await parent();

  const [row] = await db.select({ n: count() }).from(features)
    .where(and(eq(features.projectId, project.id), eq(features.archived, false)));

  return {
    featureCount:    row?.n ?? 0,
    archiveFilename: projectArchiveFilename(project.name),
  };
}) satisfies PageServerLoad;
