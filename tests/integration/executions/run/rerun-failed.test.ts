import { describe, it, expect } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { markScenario } from '$lib/server/executions/scenario/mark-scenario';
import { finishExecution } from '$lib/server/executions/run/finish';
import { rerunFailed } from '$lib/server/executions/run/rerun-failed';
import { addManualScenario } from '$lib/server/features/manual-scenarios';
import { mkFeature, mkProject } from '../../../fixtures';

const FEATURE_CONTENT = `Feature: Login

  Scenario: Sign in succeeds
    Given valid credentials
    When I submit
    Then I see the dashboard

  Scenario: Sign in fails with bad password
    Given invalid credentials
    When I submit
    Then I see an error

  Scenario: Account is locked after 5 attempts
    Given five failed attempts
    When I try again
    Then I am locked out
`;

async function seedFinishedRun() {
  const project = await mkProject({ name: `Rerun ${Date.now()}-${Math.random()}` });
  const feature = await mkFeature(project.id, { name: 'Login', content: FEATURE_CONTENT });

  const run       = await startExecution({ featureId: feature.id, executedBy: 'Alice', environment: 'staging' });
  const scenarios = await db
    .select()
    .from(scenarioResults)
    .where(eq(scenarioResults.executionId, run.id))
    .orderBy(asc(scenarioResults.scenarioName));

  return { project, feature, run, scenarios };
}

describe('rerunFailed', () => {
  it('starts a new run with only the failed scenarios', async () => {
    const { run, scenarios } = await seedFinishedRun();

    const [first, second, third] = scenarios;
    if (!first || !second || !third) throw new Error('seed: expected three scenarios');

    await markScenario({ executionId: run.id, scenarioResultId: first.id,  status: 'PASSED' });
    await markScenario({ executionId: run.id, scenarioResultId: second.id, status: 'FAILED' });
    await markScenario({ executionId: run.id, scenarioResultId: third.id,  status: 'FAILED' });
    await finishExecution(run.id);

    const result = await rerunFailed({ parentExecutionId: run.id, executedBy: 'Alice' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.featureId).toBe(run.featureId);
    expect(result.value.status).toBe('IN_PROGRESS');
    expect(result.value.environment).toBe('staging');
    expect(result.value.featureContentAtStart).toBe(run.featureContentAtStart);

    const newScenarios = await db
      .select({ name: scenarioResults.scenarioName, status: scenarioResults.status })
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, result.value.id))
      .orderBy(asc(scenarioResults.scenarioName));

    expect(newScenarios.map((s) => s.name)).toEqual([second.scenarioName, third.scenarioName].sort());
    expect(newScenarios.every((s) => s.status === 'PENDING')).toBe(true);
  });

  it('refuses when the parent run is still running', async () => {
    const { run } = await seedFinishedRun();

    const result = await rerunFailed({ parentExecutionId: run.id, executedBy: 'Alice' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('parent-in-progress');
  });

  it('refuses when the parent has no failed scenarios', async () => {
    const { run, scenarios } = await seedFinishedRun();
    for (const s of scenarios) {
      await markScenario({ executionId: run.id, scenarioResultId: s.id, status: 'PASSED' });
    }
    await finishExecution(run.id);

    const result = await rerunFailed({ parentExecutionId: run.id, executedBy: 'Alice' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('no-failed-scenarios');
  });

  it('refuses when the parent run does not exist', async () => {
    const result = await rerunFailed({
      parentExecutionId: '0193b0a0-c0de-7000-8000-000000000000',
      executedBy:  'Alice',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('parent-not-found');
  });

  it('carries source over and renumbers positions per section', async () => {
    const project = await mkProject({ name: `Rerun mix ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, {
      name: 'Mix',
      content: 'Feature: Mix\n\n  Scenario: G1\n  Scenario: G2\n  Scenario: G3\n',
    });
    await addManualScenario({ featureId: feature.id, name: 'M1' });
    await addManualScenario({ featureId: feature.id, name: 'M2' });

    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice' });
    const seeded = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, run.id))
      .orderBy(asc(scenarioResults.source), asc(scenarioResults.position));

    const [g1, g2, g3, m1, m2] = seeded;
    if (!g1 || !g2 || !g3 || !m1 || !m2) throw new Error('seed: expected 5 scenarios');

    await markScenario({ executionId: run.id, scenarioResultId: g1.id, status: 'PASSED' });
    await markScenario({ executionId: run.id, scenarioResultId: g2.id, status: 'FAILED' });
    await markScenario({ executionId: run.id, scenarioResultId: g3.id, status: 'FAILED' });
    await markScenario({ executionId: run.id, scenarioResultId: m1.id, status: 'PASSED' });
    await markScenario({ executionId: run.id, scenarioResultId: m2.id, status: 'FAILED' });
    await finishExecution(run.id);

    const result = await rerunFailed({ parentExecutionId: run.id, executedBy: 'Alice' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rerunRows = await db
      .select({ name: scenarioResults.scenarioName, source: scenarioResults.source, position: scenarioResults.position })
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, result.value.id))
      .orderBy(asc(scenarioResults.source), asc(scenarioResults.position));

    expect(rerunRows).toEqual([
      { name: 'G2', source: 'GHERKIN', position: 1 },
      { name: 'G3', source: 'GHERKIN', position: 2 },
      { name: 'M2', source: 'MANUAL',  position: 1 },
    ]);
  });

  it('returns only manual rows when only manual scenarios failed', async () => {
    const project = await mkProject({ name: `Rerun manual ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, { name: 'M', content: 'Feature: M\n\n  Scenario: G1\n' });
    await addManualScenario({ featureId: feature.id, name: 'M1' });

    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice' });
    const seeded = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
    const g1 = seeded.find((r) => r.source === 'GHERKIN');
    const m1 = seeded.find((r) => r.source === 'MANUAL');
    if (!g1 || !m1) throw new Error('seed: expected one of each source');

    await markScenario({ executionId: run.id, scenarioResultId: g1.id, status: 'PASSED' });
    await markScenario({ executionId: run.id, scenarioResultId: m1.id, status: 'FAILED' });
    await finishExecution(run.id);

    const result = await rerunFailed({ parentExecutionId: run.id, executedBy: 'Alice' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rerunRows = await db
      .select({ name: scenarioResults.scenarioName, source: scenarioResults.source, position: scenarioResults.position })
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, result.value.id));

    expect(rerunRows).toEqual([{ name: 'M1', source: 'MANUAL', position: 1 }]);
  });
});
