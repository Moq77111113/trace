import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { listFeaturesByGroup } from '$lib/server/features/queries';
import { appendCrumb } from '$lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, params.pid),
  });
  if (!project) throw error(404, 'Project not found');

  const tree = await listFeaturesByGroup(params.pid);
  const { breadcrumbs } = await parent();

  return {
    project,
    tree,
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_projects(), href: '/' },
      { label: project.name, href: `/projects/${project.id}` },
    ),
  };
}) satisfies LayoutServerLoad;
