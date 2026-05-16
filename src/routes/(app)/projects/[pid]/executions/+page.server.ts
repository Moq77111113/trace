import {
  listExecutionEnvironments,
  listExecutionsForProject,
  listFlakeFeatureIds,
} from '$lib/server/executions/queries';
import { parseExecutionFilters } from '$lib/server/executions/filters';
import { listFeatures } from '$lib/server/features/queries';
import { listGroups } from '$lib/server/groups/queries';
import { appendCrumb } from '$lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, url, parent }) => {
  const { filters, dateRange } = parseExecutionFilters(url);

  const [runsResult, environments, allFeatures, allGroups, flakeFeatureIds, parentData] = await Promise.all([
    listExecutionsForProject(params.pid, filters),
    listExecutionEnvironments(params.pid),
    listFeatures(params.pid),
    listGroups(params.pid),
    listFlakeFeatureIds(params.pid),
    parent(),
  ]);

  return {
    ...runsResult,
    filters,
    dateRange,
    environments,
    features:    allFeatures.map((f) => ({ id: f.id, name: f.name })),
    groups:      allGroups.map((g) => ({ id: g.id, name: g.name })),
    flakeFeatureIds,
    breadcrumbs: appendCrumb(parentData.breadcrumbs, { label: m.nav_executions() }),
  };
}) satisfies PageServerLoad;
