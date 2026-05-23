import { requireProject } from '$lib/server/projects/authz';
import { visibleFeatureIds } from '$lib/server/features/authz';
import { listFeaturesByGroup } from '$lib/server/features/read/queries';
import { listFlakeFeatureIds } from '$lib/server/executions/read/queries';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent, locals }) => {
  const project = await requireProject(locals.authz, params.slug, 'project.access');

  const [tree, flakeFeatureIds, parentData, visible] = await Promise.all([
    listFeaturesByGroup(project.id),
    listFlakeFeatureIds(project.id),
    parent(),
    visibleFeatureIds(locals.authz, project.id, 'feature.view'),
  ]);

  const filteredTree = {
    groups:    tree.groups.map((g) => ({ ...g, features: g.features.filter((f) => visible.has(f.id)) })),
    ungrouped: tree.ungrouped.filter((f) => visible.has(f.id)),
  };

  return {
    project,
    tree: filteredTree,
    flakeFeatureIds,
    breadcrumbs: appendCrumb(
      parentData.breadcrumbs,
      { label: m.nav_projects(), href: '/' },
      { label: project.name, href: `/p/${project.slug}` },
    ),
  };
}) satisfies LayoutServerLoad;
