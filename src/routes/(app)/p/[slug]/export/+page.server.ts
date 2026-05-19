import { and, count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { projectArchiveFilename } from '$lib/features/feature-import/lib/format';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load = (async ({ parent }) => {
  const { project, breadcrumbs } = await parent();

  const [row] = await db.select({ n: count() }).from(features)
    .where(and(eq(features.projectId, project.id), eq(features.archived, false)));

  return {
    featureCount:    row?.n ?? 0,
    archiveFilename: projectArchiveFilename(project.name),
    breadcrumbs:     appendCrumb(breadcrumbs, { label: m.nav_export() }),
  };
}) satisfies PageServerLoad;
