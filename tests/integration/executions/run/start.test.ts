import { describe, it, expect } from 'vitest';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, scenarioResults } from '$lib/server/db/schema';
import type { ParseError } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { addManualScenario, archiveManualScenario } from '$lib/server/features/manual-scenarios';
import { mkFeature, mkProject } from '$testing/fixtures';

async function freshFeatureBase(content: string) {
  const project = await mkProject({ name: `Run ${Date.now()}-${Math.random()}` });
  const feature = await mkFeature(project.id, { name: 'Login', content });
  return { project, feature };
}

async function setParseErrors(featureId: string, errors: ParseError[]) {
  await db.update(features).set({ parseErrors: errors }).where(eq(features.id, featureId));
}

const twoScenarioFeature =
  'Feature: Login\n\n  Scenario: A\n    Given x\n\n  Scenario: B\n    When y\n';

describe('startExecution', () => {
  it('creates a RUNNING row with one scenario_result per Gherkin scenario', async () => {
    const { feature } = await freshFeatureBase(twoScenarioFeature);
    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice', environment: 'staging' });

    expect(run.status).toBe('IN_PROGRESS');
    expect(run.source).toBe('MANUAL');
    expect(run.executedBy).toBe('Alice');
    expect(run.environment).toBe('staging');
    expect(run.featureContentAtStart).toContain('Feature: Login');

    const results = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.source === 'GHERKIN')).toBe(true);
    expect(results.map((r) => r.position).sort()).toEqual([1, 2]);
  });

  it('rejects features with parse errors', async () => {
    const { feature } = await freshFeatureBase(twoScenarioFeature);
    await setParseErrors(feature.id, [{ line: 1, message: 'oops' }]);
    await expect(startExecution({ featureId: feature.id, executedBy: 'Alice' })).rejects.toThrow(/parse errors/i);
  });

  it('rejects when no Gherkin AND no active manual scenarios exist', async () => {
    const { feature } = await freshFeatureBase('Feature: Empty\n');
    await expect(startExecution({ featureId: feature.id, executedBy: 'Alice' })).rejects.toThrow(/no runnable/i);
  });

  it('starts with manual-only when Gherkin parses to zero scenarios', async () => {
    const { feature } = await freshFeatureBase('');
    await addManualScenario({ featureId: feature.id, name: 'Visual A' });
    await addManualScenario({ featureId: feature.id, name: 'Visual B' });

    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice' });
    const results = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, run.id))
      .orderBy(asc(scenarioResults.source), asc(scenarioResults.position));

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.source === 'MANUAL')).toBe(true);
    expect(results.map((r) => r.scenarioName)).toEqual(['Visual A', 'Visual B']);
    expect(results.map((r) => r.position)).toEqual([1, 2]);
  });

  it('merges Gherkin + manual with independent position counters per section', async () => {
    const { feature } = await freshFeatureBase(twoScenarioFeature);
    await addManualScenario({ featureId: feature.id, name: 'Visual M1' });
    await addManualScenario({ featureId: feature.id, name: 'Visual M2' });

    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice' });
    const results = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, run.id))
      .orderBy(asc(scenarioResults.source), asc(scenarioResults.position));

    expect(results.map((r) => ({ name: r.scenarioName, source: r.source, position: r.position }))).toEqual([
      { name: 'A',         source: 'GHERKIN', position: 1 },
      { name: 'B',         source: 'GHERKIN', position: 2 },
      { name: 'Visual M1', source: 'MANUAL',  position: 1 },
      { name: 'Visual M2', source: 'MANUAL',  position: 2 },
    ]);
  });

  it('excludes archived manual scenarios from the snapshot', async () => {
    const { feature } = await freshFeatureBase(twoScenarioFeature);
    const archived = await addManualScenario({ featureId: feature.id, name: 'Will be archived' });
    await addManualScenario({ featureId: feature.id, name: 'Active' });
    await archiveManualScenario({ scenarioId: archived.id });

    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice' });
    const results = await db
      .select({ name: scenarioResults.scenarioName, source: scenarioResults.source })
      .from(scenarioResults)
      .where(and(eq(scenarioResults.executionId, run.id), eq(scenarioResults.source, 'MANUAL')));

    expect(results.map((r) => r.name)).toEqual(['Active']);
  });

  it('densifies manual positions when manual_scenarios.position has gaps', async () => {
    const { feature } = await freshFeatureBase('');
    const a = await addManualScenario({ featureId: feature.id, name: 'A' });
    const b = await addManualScenario({ featureId: feature.id, name: 'B' });
    const c = await addManualScenario({ featureId: feature.id, name: 'C' });
    await archiveManualScenario({ scenarioId: b.id });

    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice' });
    const results = await db
      .select({ name: scenarioResults.scenarioName, position: scenarioResults.position })
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, run.id))
      .orderBy(asc(scenarioResults.position));

    expect(results).toEqual([
      { name: 'A', position: 1 },
      { name: 'C', position: 2 },
    ]);
    expect(a.position).toBe(1);
    expect(c.position).toBe(3);
  });
});
