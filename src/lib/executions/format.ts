import type { StatusKind } from '$lib/components/ui/Status.svelte';
import type { ExecutionFilters } from '$lib/server/executions/queries';

export function hasAnyExecutionFilter(
  filters:   ExecutionFilters,
  dateRange: { from: string | null; to: string | null },
): boolean {
  return (
    Boolean(filters.status) ||
    Boolean(filters.source) ||
    Boolean(filters.environment) ||
    Boolean(filters.featureId) ||
    Boolean(filters.groupId) ||
    Boolean(dateRange.from) ||
    Boolean(dateRange.to)
  );
}

export type BadgeVariant = 'passed' | 'failed' | 'skipped' | 'running' | 'neutral';

export function stepStatusFor(scenarioStatus: string): StatusKind {
  const upper = scenarioStatus.toUpperCase();
  if (upper === 'PASSED')  return 'pass';
  if (upper === 'FAILED')  return 'fail';
  if (upper === 'SKIPPED') return 'skip';
  return 'pending';
}

export function statusBadgeVariant(status: string): BadgeVariant {
  if (status === 'PASSED')  return 'passed';
  if (status === 'FAILED')  return 'failed';
  if (status === 'SKIPPED') return 'skipped';
  if (status === 'ABORTED') return 'skipped';
  if (status === 'IN_PROGRESS') return 'running';
  return 'neutral';
}

export function statusIcon(status: string): string {
  if (status === 'PASSED')  return '✓';
  if (status === 'FAILED')  return '✗';
  if (status === 'SKIPPED') return '↷';
  return '○';
}

export function formatScenarioDuration(ms: number | null): string {
  if (ms === null) return '';
  return `${(ms / 1000).toFixed(1)}s`;
}

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateParam(raw: string | null): string | null {
  if (!raw || !DATE_PARAM_PATTERN.test(raw)) return null;
  const t = Date.parse(`${raw}T00:00:00Z`);
  return Number.isNaN(t) ? null : raw;
}

export function toStartOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function toEndOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

export function formatExecutionDuration(startedAt: Date | string, finishedAt: Date | string | null): string {
  if (!finishedAt) return '—';
  const start = typeof startedAt  === 'string' ? new Date(startedAt)  : startedAt;
  const end   = typeof finishedAt === 'string' ? new Date(finishedAt) : finishedAt;
  const s = Math.round((end.getTime() - start.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export type ScenarioCounts = {
  passed:  number;
  failed:  number;
  skipped: number;
  pending: number;
};

export type DistBarSegmentKind = 'pass' | 'fail' | 'skip' | 'neutral';

export type DistBarSegment = {
  kind:  DistBarSegmentKind;
  width: number;
};

export function distBarSegments(c: ScenarioCounts): DistBarSegment[] {
  const total = c.passed + c.failed + c.skipped + c.pending;
  if (total === 0) return [{ kind: 'neutral', width: 100 }];

  const segments: DistBarSegment[] = [
    { kind: 'pass',    width: (c.passed  / total) * 100 },
    { kind: 'fail',    width: (c.failed  / total) * 100 },
    { kind: 'skip',    width: (c.skipped / total) * 100 },
    { kind: 'neutral', width: (c.pending / total) * 100 },
  ];

  return segments.filter((s) => s.width > 0);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}
