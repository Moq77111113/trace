import {
  listExecutionEnvironments,
  listExecutionsForProject,
  listFlakeFeatureIds,
} from '$lib/server/executions/queries';
import { parseExecutionFilters } from '$lib/server/executions/filters';
import { listFeatures } from '$lib/server/features/queries';
import { listGroups } from '$lib/server/groups/queries';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load = (async ({ url, parent }) => {
  const { filters, dateRange } = parseExecutionFilters(url);
  const { project, breadcrumbs } = await parent();

  const [runsResult, environments, allFeatures, allGroups, flakeFeatureIds] = await Promise.all([
    listExecutionsForProject(project.id, filters),
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
