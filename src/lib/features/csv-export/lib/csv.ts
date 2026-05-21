import type { ExecutionExportRow } from '$lib/server/executions/read/queries';
import { toDate } from '$lib/shared/lib/date';

export const EXPORT_ROW_CAP = 10_000;

const CRLF = '\r\n';

const NEEDS_QUOTING = /[",\r\n]/;

export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (!NEEDS_QUOTING.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function durationSeconds(startedAt: Date, finishedAt: Date | null): string {
  if (!finishedAt) return '';
  return String(Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
}

const HEADERS = [
  'execution_id',
  'feature_code',
  'feature',
  'status',
  'source',
  'executed_by',
  'environment',
  'ci_branch',
  'ci_commit',
  'started_at',
  'finished_at',
  'duration_seconds',
  'passed',
  'failed',
  'skipped',
  'pending',
] as const;

export function toExecutionsCsv(rows: ExecutionExportRow[]): string {
  const lines: string[] = [HEADERS.join(',')];

  for (const r of rows) {
    const startedAt  = toDate(r.startedAt);
    const finishedAt = r.finishedAt ? toDate(r.finishedAt) : null;

    lines.push([
      csvField(r.id),
      csvField(r.featureCode),
      csvField(r.featureName),
      csvField(r.status),
      csvField(r.source),
      csvField(r.executedBy),
      csvField(r.environment),
      csvField(r.ciMetadata?.branch ?? ''),
      csvField(r.ciMetadata?.commit ?? ''),
      csvField(startedAt.toISOString()),
      csvField(finishedAt ? finishedAt.toISOString() : ''),
      csvField(durationSeconds(startedAt, finishedAt)),
      csvField(r.passed),
      csvField(r.failed),
      csvField(r.skipped),
      csvField(r.pending),
    ].join(','));
  }

  return lines.join(CRLF) + CRLF;
}

export function executionsCsvFilename(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `trace-executions-${y}-${m}-${d}.csv`;
}
