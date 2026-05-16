import { parseDateParam, toStartOfDay, toEndOfDay } from '$lib/executions/format';
import type {
  ExecutionFilters,
  ExecutionSourceFilter,
  ExecutionStatusFilter,
} from './queries';

const STATUS_VALUES = ['PASSED', 'FAILED', 'SKIPPED', 'ABORTED', 'IN_PROGRESS'] as const satisfies readonly ExecutionStatusFilter[];
const SOURCE_VALUES = ['MANUAL', 'CI']                                          as const satisfies readonly ExecutionSourceFilter[];

function parseEnum<T extends string>(v: string | null, allowed: readonly T[]): T | undefined {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function parsePage(v: string | null): number {
  const n = Number(v ?? '1');
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export type ParsedExecutionFilters = {
  filters:   ExecutionFilters;
  dateRange: { from: string | null; to: string | null };
};

/**
 * Parses the executions list/export query string into a normalised filter set.
 * Shared by the list page loader and the CSV export route so the two surfaces
 * can never drift on which params they honour.
 */
export function parseExecutionFilters(url: URL): ParsedExecutionFilters {
  const filters: ExecutionFilters = { page: parsePage(url.searchParams.get('page')) };
  const status      = parseEnum(url.searchParams.get('status'), STATUS_VALUES);
  const source      = parseEnum(url.searchParams.get('source'), SOURCE_VALUES);
  const environment = url.searchParams.get('environment') ?? '';
  const featureId   = url.searchParams.get('feature')     ?? '';
  const groupId     = url.searchParams.get('group')       ?? '';
  const fromParam   = parseDateParam(url.searchParams.get('from'));
  const toParam     = parseDateParam(url.searchParams.get('to'));

  if (status)      filters.status      = status;
  if (source)      filters.source      = source;
  if (environment) filters.environment = environment;
  if (featureId)   filters.featureId   = featureId;
  if (groupId)     filters.groupId     = groupId;
  if (fromParam)   filters.from        = toStartOfDay(fromParam);
  if (toParam)     filters.to          = toEndOfDay(toParam);

  return { filters, dateRange: { from: fromParam, to: toParam } };
}
