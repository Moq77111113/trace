import {
  listExecutionEnvironments,
  listExecutionsForProject,
  listFlakeFeatureIds,
} from '$lib/server/executions/read/queries';
import { parseExecutionFilters } from '$lib/server/executions/read/filters';
import { listFeatures } from '$lib/server/features/read/queries';
import { listGroups } from '$lib/server/groups/queries';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import { requireProject } from '$lib/server/projects/authz';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load = (async ({ url, params, parent, locals }) => {
  const { filters, dateRange } = parseExecutionFilters(url);
  const { project, breadcrumbs } = await parent();
  await requireProject(locals.authz, params.slug, 'execution.review');

  const [runsResult, environments, allFeatures, allGroups, flakeFeatureIds] = await Promise.all([
    listExecutionsForProject(locals.authz, project.id, filters),
    listExecutionEnvironments(project.id),
    listFeatures(project.id),
    listGroups(project.id),
    listFlakeFeatureIds(project.id),
  ]);

  return {
    ...runsResult,
    filters,
    dateRange,
    environments,
    features:    allFeatures.map((f) => ({ id: f.id, name: f.name })),
    groups:      allGroups.map((g) => ({ id: g.id, name: g.name })),
    flakeFeatureIds,
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_executions() }),
  };
}) satisfies PageServerLoad;
