import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCucumberJson } from '$lib/server/executions/ingest/cucumber-json/parse';

function load(file: string) {
  return JSON.parse(readFileSync(resolve('tests/fixtures/cucumber-json', file), 'utf-8'));
}

describe('parseCucumberJson', () => {
  it('parses a single passing feature into a one-entry array', () => {
    const r = parseCucumberJson(load('passed.json'));

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(1);
    const [f] = r.value;
    expect(f?.featureName).toBe('Login');
    expect(f?.scenarios).toHaveLength(1);
    expect(f?.scenarios[0]).toMatchObject({ name: 'Successful login', status: 'PASSED' });
    expect(f?.scenarios[0]?.durationMs).toBe(200);
  });

  it('preserves ALL features when the payload contains multiple', () => {
    const r = parseCucumberJson(load('multi.json'));

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(3);
    expect(r.value.map((f) => f.featureName)).toEqual(['Login', 'Signup', 'Checkout']);
  });

  it('extracts cucumber feature tags into the tags array', () => {
    const r = parseCucumberJson(load('multi.json'));

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]?.tags).toEqual(['@trace=tp1-1', '@smoke']);
    expect(r.value[1]?.tags).toEqual([]);
    expect(r.value[2]?.tags).toEqual([]);
  });

  it('parses a failing scenario with error message', () => {
    const r = parseCucumberJson(load('failed.json'));

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [first] = r.value[0]?.scenarios ?? [];
    expect(first?.status).toBe('FAILED');
    expect(first?.errorMessage).toContain('AssertionError');
  });

  it('derives per-scenario status across a mixed feature', () => {
    const r = parseCucumberJson(load('mixed.json'));

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]?.scenarios.map((s) => s.status)).toEqual(['PASSED', 'FAILED', 'SKIPPED']);
  });

  it('returns PARSE_EMPTY_PAYLOAD on an empty array', () => {
    const r = parseCucumberJson([]);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('PARSE_EMPTY_PAYLOAD');
  });

  it('returns PARSE_SCHEMA_INVALID on payload without a feature name', () => {
    const r = parseCucumberJson([{ id: 'x', name: '', elements: [] }]);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('PARSE_SCHEMA_INVALID');
  });
});
