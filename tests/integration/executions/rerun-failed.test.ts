import { describe, it, expect } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/start';
import { markScenario } from '$lib/server/executions/mark-scenario';
import { finishExecution } from '$lib/server/executions/finish';
import { rerunFailed } from '$lib/server/executions/rerun-failed';
import { mkFeature, mkProject } from '../../fixtures';

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
});
