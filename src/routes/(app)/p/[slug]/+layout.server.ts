import { requireProject } from '$lib/server/projects/authz';
import { projectCapabilities } from '$lib/server/authz/capabilities';
import { listFeaturesByGroup } from '$lib/server/features/read/queries';
import { listFlakeFeatureIds } from '$lib/server/executions/read/queries';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent, locals }) => {
  const project = await requireProject(locals.authz, params.slug, 'project.access');

  const [tree, flakeFeatureIds, capabilities, parentData] = await Promise.all([
    listFeaturesByGroup(locals.authz, project.id),
    listFlakeFeatureIds(project.id),
    projectCapabilities(locals.authz, project.id),
    parent(),
  ]);

  return {
    project,
    tree,
    flakeFeatureIds,
    capabilities,
    breadcrumbs: appendCrumb(
      parentData.breadcrumbs,
      { label: m.nav_projects(), href: '/' },
      { label: project.name, href: `/p/${project.slug}` },
    ),
  };
}) satisfies LayoutServerLoad;
