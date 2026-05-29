import { describe, it, expect } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults } from '$lib/server/db/schema';
import { ingestRun } from '$lib/server/executions/ingest/pipeline';
import type { IngestedFeatureRun } from '$lib/server/executions/ingest/cucumber-json/types';
import { mkFeature, mkProject } from '$testing/fixtures';

function run(featureName: string, scenarios: IngestedFeatureRun['scenarios'], tags: string[] = []): IngestedFeatureRun {
  return { featureName, tags, scenarios, warnings: [] };
}

describe('ingestRun', () => {
  it('writes one execution per matched feature', async () => {
    const project = await mkProject({ name: `Multi ${Date.now()}-${Math.random()}` });
    const login   = await mkFeature(project.id, { name: 'Login' });
    const signup  = await mkFeature(project.id, { name: 'Signup' });

    const result = await ingestRun({
      projectId:   project.id,
      executedBy:  'ci',
      environment: 'staging',
      parsed: [
        run('Login',  [{ name: 'A', status: 'PASSED', durationMs: 100, logs: null, errorMessage: null }]),
        run('Signup', [{ name: 'B', status: 'FAILED', durationMs: 200, logs: null, errorMessage: 'boom' }]),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('FAILED');
    expect(result.value.executions).toHaveLength(2);
    expect(result.value.unknownFeatures).toEqual([]);

    const inserted = await db.select().from(executions).where(eq(executions.featureId, login.id));
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.status).toBe('PASSED');

    const signupInserted = await db.select().from(executions).where(eq(executions.featureId, signup.id));
    expect(signupInserted).toHaveLength(1);
    expect(signupInserted[0]?.status).toBe('FAILED');
  });

  it('records unknown features without failing the run when at least one matches', async () => {
    const project = await mkProject({ name: `Partial ${Date.now()}-${Math.random()}` });
    await mkFeature(project.id, { name: 'Login' });

    const result = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: [
        run('Login', [{ name: 'A', status: 'PASSED', durationMs: 10, logs: null, errorMessage: null }]),
        run('Ghost', [{ name: 'X', status: 'PASSED', durationMs: 5,  logs: null, errorMessage: null }]),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.executions).toHaveLength(1);
    expect(result.value.unknownFeatures).toEqual(['Ghost']);
  });

  it('returns INGEST_NO_FEATURES_MATCHED when zero features match', async () => {
    const project = await mkProject({ name: `None ${Date.now()}-${Math.random()}` });

    const result = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: [run('Ghost', [{ name: 'A', status: 'PASSED', durationMs: 1, logs: null, errorMessage: null }])],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INGEST_NO_FEATURES_MATCHED');
  });

  it('matches via @trace= tag and reports matched_via: code', async () => {
    const project = await mkProject({ name: `Tag ${Date.now()}-${Math.random()}`, codePrefix: 'tm' });
    const feature = await mkFeature(project.id, { name: 'Different Name' });

    const result = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: [run('Anything', [{ name: 'A', status: 'PASSED', durationMs: 1, logs: null, errorMessage: null }], [`@trace=tm-${feature.codeSeq}`])],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.executions[0]?.matchedVia).toBe('code');
  });

  it('warns when a feature matched by name (push toward @trace= tagging)', async () => {
    const project = await mkProject({ name: `Warn ${Date.now()}-${Math.random()}`, codePrefix: 'wn' });
    const feature = await mkFeature(project.id, { name: 'Login' });

    const result = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: [run('Login', [{ name: 'A', status: 'PASSED', durationMs: 1, logs: null, errorMessage: null }])],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expectedCode = `wn-${feature.codeSeq}`;
    expect(result.value.warnings.some((w) => w.includes('matched by name') && w.includes(expectedCode))).toBe(true);
  });

  it('warns when a @trace= tag references a missing code, and skips the feature', async () => {
    const project = await mkProject({ name: `Bad tag ${Date.now()}-${Math.random()}`, codePrefix: 'bt' });
    await mkFeature(project.id, { name: 'Login' });

    const result = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: [
        run('Login', [{ name: 'A', status: 'PASSED', durationMs: 1, logs: null, errorMessage: null }]),
        run('Other', [{ name: 'B', status: 'PASSED', durationMs: 1, logs: null, errorMessage: null }], ['@trace=bt-999']),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.executions).toHaveLength(1);
    expect(result.value.unknownFeatures).toContain('Other');
    expect(result.value.warnings.some((w) => w.includes('@trace=bt-999'))).toBe(true);
  });

  it('freezes the gherkin steps of each matched scenario into scenario_results', async () => {
    const project = await mkProject({ name: `Steps ${Date.now()}-${Math.random()}` });
    await mkFeature(project.id, {
      name: 'Login',
      content: 'Feature: Login\n\n  Scenario: X\n    Given a\n    When b\n    Then c\n',
    });

    const result = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: [run('Login', [{ name: 'X', status: 'PASSED', durationMs: 10, logs: null, errorMessage: null }])],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const executionId = result.value.executions[0]?.executionId;
    if (!executionId) throw new Error('expected an ingested execution id');

    const [row] = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, executionId));
    expect(row?.steps).toEqual([
      { keyword: 'Given', text: 'a', expected: null },
      { keyword: 'When',  text: 'b', expected: null },
      { keyword: 'Then',  text: 'c', expected: null },
    ]);
  });

  it('assigns position 1..N to ingested scenarios in input order', async () => {
    const project = await mkProject({ name: `Pos ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, {
      name: 'Login',
      content: 'Feature: Login\n\n  Scenario: A\n  Scenario: B\n  Scenario: C\n',
    });

    const result = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: [run('Login', [
        { name: 'A', status: 'PASSED', durationMs: 10, logs: null, errorMessage: null },
        { name: 'B', status: 'FAILED', durationMs: 20, logs: null, errorMessage: 'boom' },
        { name: 'C', status: 'PASSED', durationMs: 30, logs: null, errorMessage: null },
      ])],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const executionId = result.value.executions[0]?.executionId;
    expect(executionId).toBeDefined();

    const rows = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, executionId!))
      .orderBy(asc(scenarioResults.position));
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.scenarioName)).toEqual(['A', 'B', 'C']);
    expect(feature.id).toBeDefined();
  });
});
