import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCucumberJson } from '$lib/server/executions/ingest/cucumber-json/parse';

function load(file: string) {
  return JSON.parse(readFileSync(resolve('tests/fixtures/cucumber-json', file), 'utf-8'));
}

describe('parseCucumberJson', () => {
  it('parses a passing scenario', () => {
    const r = parseCucumberJson(load('passed.json'));

    expect(r.featureName).toBe('Login');
    expect(r.scenarios).toHaveLength(1);

    const [first] = r.scenarios;
    expect(first).toMatchObject({ name: 'Successful login', status: 'PASSED' });
    expect(first?.durationMs).toBe(200);
  });

  it('parses a failing scenario with error message', () => {
    const r = parseCucumberJson(load('failed.json'));

    const [first] = r.scenarios;
    expect(first?.status).toBe('FAILED');
    expect(first?.errorMessage).toContain('AssertionError');
  });

  it('derives per-scenario status across a mixed feature', () => {
    const r = parseCucumberJson(load('mixed.json'));

    expect(r.scenarios.map((s) => s.status)).toEqual(['PASSED', 'FAILED', 'SKIPPED']);
  });

  it('rejects empty payload', () => {
    expect(() => parseCucumberJson([])).toThrow(/no features/i);
  });

  it('rejects payload without a feature name', () => {
    expect(() => parseCucumberJson([{ id: 'x', name: '', elements: [] }])).toThrow(/feature name/i);
  });
});
