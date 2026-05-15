import {
  listRunEnvironments,
  listRunsForProject,
  type RunFilters,
  type RunSourceFilter,
  type RunStatusFilter,
} from '$lib/server/runs/queries';
import { listFeatures } from '$lib/server/features/queries';
import { listGroups } from '$lib/server/groups/queries';
import type { PageServerLoad } from './$types';

const STATUS_VALUES = ['PASSED', 'FAILED', 'SKIPPED', 'RUNNING'] as const satisfies readonly RunStatusFilter[];
const SOURCE_VALUES = ['MANUAL', 'CI']                          as const satisfies readonly RunSourceFilter[];

function parseEnum<T extends string>(v: string | null, allowed: readonly T[]): T | undefined {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function parsePage(v: string | null): number {
  const n = Number(v ?? '1');
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export const load = (async ({ params, url }) => {
  const filters: RunFilters = { page: parsePage(url.searchParams.get('page')) };
  const status      = parseEnum(url.searchParams.get('status'), STATUS_VALUES);
  const source      = parseEnum(url.searchParams.get('source'), SOURCE_VALUES);
  const environment = url.searchParams.get('environment') ?? '';
  const featureId   = url.searchParams.get('feature')     ?? '';
  const groupId     = url.searchParams.get('group')       ?? '';

  if (status)      filters.status      = status;
  if (source)      filters.source      = source;
  if (environment) filters.environment = environment;
  if (featureId)   filters.featureId   = featureId;
  if (groupId)     filters.groupId     = groupId;

  const [runsResult, environments, allFeatures, allGroups] = await Promise.all([
    listRunsForProject(params.pid, filters),
    listRunEnvironments(params.pid),
    listFeatures(params.pid),
    listGroups(params.pid),
  ]);

  return {
    ...runsResult,
    filters,
    environments,
    features: allFeatures.map((f) => ({ id: f.id, name: f.name })),
    groups:   allGroups.map((g) => ({ id: g.id, name: g.name })),
  };
}) satisfies PageServerLoad;
