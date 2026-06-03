import { describe, it, expect } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { markScenario } from '$lib/server/executions/scenario/mark-scenario';
import { finishExecution } from '$lib/server/executions/run/finish';
import { rerunFailed } from '$lib/server/executions/run/rerun-failed';
import { addManualScenario } from '$lib/server/features/manual-scenarios';
import { addStep } from '$lib/server/features/manual-scenario-steps';
import { mkFeature, mkProject } from '$testing/fixtures';

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

  it('carries the parent frozen steps into the re-run row', async () => {
    const project = await mkProject({ name: `Rerun steps ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, { name: 'Steps', content: 'Feature: Steps\n' });
    const scenario = await addManualScenario({ featureId: feature.id, name: 'M1' });
    await addStep({ scenarioId: scenario.id, action: 'open the page', expected: 'page is visible' });
    await addStep({ scenarioId: scenario.id, action: 'click submit', expected: null });

    const run = await startExecution({ featureId: feature.id, executedBy: 'Alice' });
    const [seeded] = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, run.id));
    if (!seeded) throw new Error('seed: expected one scenario');

    await markScenario({ executionId: run.id, scenarioResultId: seeded.id, status: 'FAILED' });
    await finishExecution(run.id);

    const result = await rerunFailed({ parentExecutionId: run.id, executedBy: 'Alice' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [rerunRow] = await db
      .select({ id: scenarioResults.id })
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, result.value.id));
    if (!rerunRow) throw new Error('rerun: expected one scenario');

    const rerunSteps = await db
      .select({ keyword: scenarioResultSteps.keyword, text: scenarioResultSteps.text, expected: scenarioResultSteps.expected })
      .from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.scenarioResultId, rerunRow.id))
      .orderBy(asc(scenarioResultSteps.position));

    expect(rerunSteps).toEqual([
      { keyword: null, text: 'open the page', expected: 'page is visible' },
      { keyword: null, text: 'click submit',  expected: null },
    ]);
  });

  it('carries the parent failed scenario steps into the rerun, reset to PENDING', async () => {
    const project = await mkProject({ name: `Rerun steps ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, {
      name: 'F', content: 'Feature: F\n  Scenario: S\n    Given a\n    Then b\n',
    });
    const parent = await startExecution({ featureId: feature.id, executedBy: 'tester' });
    const [sc] = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, parent.id));
    if (!sc) throw new Error('seed: expected one scenario');
    await markScenario({ executionId: parent.id, scenarioResultId: sc.id, status: 'FAILED' });
    await finishExecution(parent.id);

    const res = await rerunFailed({ parentExecutionId: parent.id, executedBy: 'tester' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const [child] = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, res.value.id));
    if (!child) throw new Error('rerun: expected one scenario');
    const steps = await db.select().from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.scenarioResultId, child.id)).orderBy(asc(scenarioResultSteps.position));

    expect(steps.map((s) => [s.text, s.verdict])).toEqual([['a', 'PENDING'], ['b', 'PENDING']]);
  });
});
