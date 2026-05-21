import { describe, it, expect } from 'vitest';
import { csvField, executionsCsvFilename, toExecutionsCsv } from '$lib/features/csv-export/lib/csv';
import type { ExecutionExportRow } from '$lib/server/executions/read/queries';

describe('csvField', () => {
  it('returns empty string for null and undefined', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
  });

  it('returns numbers as strings without quoting', () => {
    expect(csvField(42)).toBe('42');
    expect(csvField(0)).toBe('0');
  });

  it('leaves simple strings unquoted', () => {
    expect(csvField('hello')).toBe('hello');
  });

  it('quotes fields containing commas', () => {
    expect(csvField('a,b')).toBe('"a,b"');
  });

  it('quotes fields containing newlines', () => {
    expect(csvField('a\nb')).toBe('"a\nb"');
    expect(csvField('a\r\nb')).toBe('"a\r\nb"');
  });

  it('quotes and escapes double quotes', () => {
    expect(csvField('she said "hi"')).toBe('"she said ""hi"""');
  });
});

function row(overrides: Partial<ExecutionExportRow> = {}): ExecutionExportRow {
  return {
    id:          'exec-1',
    status:      'PASSED',
    source:      'CI',
    executedBy:  'ci@example.com',
    environment: 'prod',
    startedAt:   new Date('2026-01-15T10:00:00.000Z'),
    finishedAt:  new Date('2026-01-15T10:00:30.000Z'),
    ciMetadata:  null,
    featureName: 'Sign in',
    featureCode: 'auth-1',
    passed:  3,
    failed:  0,
    skipped: 0,
    pending: 0,
    ...overrides,
  };
}

describe('toExecutionsCsv', () => {
  it('emits header row only when no data', () => {
    const out = toExecutionsCsv([]);
    expect(out).toBe(
      'execution_id,feature_code,feature,status,source,executed_by,environment,ci_branch,ci_commit,started_at,finished_at,duration_seconds,passed,failed,skipped,pending\r\n',
    );
  });

  it('renders an execution row with ISO timestamps and duration seconds', () => {
    const out = toExecutionsCsv([row()]);
    const lines = out.split('\r\n');
    expect(lines[1]).toBe(
      'exec-1,auth-1,Sign in,PASSED,CI,ci@example.com,prod,,,2026-01-15T10:00:00.000Z,2026-01-15T10:00:30.000Z,30,3,0,0,0',
    );
  });

  it('flattens ci_branch and ci_commit from ciMetadata', () => {
    const out = toExecutionsCsv([row({ ciMetadata: { branch: 'main', commit: 'a3fa827abc' } })]);
    const cells = out.split('\r\n')[1]?.split(',') ?? [];
    expect(cells[7]).toBe('main');
    expect(cells[8]).toBe('a3fa827abc');
  });

  it('leaves finished_at and duration_seconds blank for unfinished runs', () => {
    const out = toExecutionsCsv([row({ status: 'IN_PROGRESS', finishedAt: null })]);
    const cells = out.split('\r\n')[1]?.split(',') ?? [];
    expect(cells[10]).toBe('');
    expect(cells[11]).toBe('');
  });

  it('leaves environment blank when null', () => {
    const out = toExecutionsCsv([row({ environment: null })]);
    const cells = out.split('\r\n')[1]?.split(',') ?? [];
    expect(cells[6]).toBe('');
  });

  it('quotes feature names containing commas', () => {
    const out = toExecutionsCsv([row({ featureName: 'Sign in, then out' })]);
    expect(out).toContain('"Sign in, then out"');
  });

  it('accepts string-shaped dates from Drizzle drivers', () => {
    const out = toExecutionsCsv([
      // @ts-expect-error — simulates a driver that returns ISO strings instead of Date
      row({ startedAt: '2026-01-15T10:00:00.000Z', finishedAt: '2026-01-15T10:00:45.000Z' }),
    ]);
    const cells = out.split('\r\n')[1]?.split(',') ?? [];
    expect(cells[9]).toBe('2026-01-15T10:00:00.000Z');
    expect(cells[10]).toBe('2026-01-15T10:00:45.000Z');
    expect(cells[11]).toBe('45');
  });
});

describe('executionsCsvFilename', () => {
  it('formats the date as YYYY-MM-DD in UTC', () => {
    expect(executionsCsvFilename(new Date('2026-05-16T23:30:00.000Z'))).toBe('trace-executions-2026-05-16.csv');
  });
});
