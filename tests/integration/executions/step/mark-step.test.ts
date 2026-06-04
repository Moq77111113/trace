import { describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { mkProject, mkFeature } from '$testing/fixtures';
import { startExecution } from '$lib/server/executions/run/start';
import { finishExecution } from '$lib/server/executions/run/finish';
import { markStep } from '$lib/server/executions/step/mark-step';

async function runWithSteps() {
  const project = await mkProject({ name: `Step ${Date.now()}-${Math.random()}` });
  const feature = await mkFeature(project.id, {
    name: 'F', content: 'Feature: F\n  Scenario: S\n    Given a\n    Then b\n',
  });
  const run = await startExecution({ featureId: feature.id, executedBy: 'tester' });
  const [scenario] = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
  if (!scenario) throw new Error('seed: scenario_results not created');
  const steps = await db.select().from(scenarioResultSteps)
    .where(eq(scenarioResultSteps.scenarioResultId, scenario.id)).orderBy(asc(scenarioResultSteps.position));
  const [first, second] = steps;
  if (!first || !second) throw new Error('seed: expected two scenario_result_steps');
  return { run, scenario, first, second };
}

describe('markStep', () => {
  it('sets one step verdict and recomputes the scenario status', async () => {
    const { run, scenario, first, second } = await runWithSteps();

    await markStep({ executionId: run.id, scenarioResultStepId: first.id, verdict: 'PASSED' });
    const [afterFirst] = await db.select().from(scenarioResults).where(eq(scenarioResults.id, scenario.id));
    expect(afterFirst?.status).toBe('PENDING');

    await markStep({ executionId: run.id, scenarioResultStepId: second.id, verdict: 'FAILED' });
    const [afterSecond] = await db.select().from(scenarioResults).where(eq(scenarioResults.id, scenario.id));
    expect(afterSecond?.status).toBe('FAILED');
  });

  it('refuses to write into a finished run', async () => {
    const { run, first } = await runWithSteps();
    await finishExecution(run.id);
    await expect(markStep({ executionId: run.id, scenarioResultStepId: first.id, verdict: 'PASSED' }))
      .rejects.toThrow(/not RUNNING/);
  });
});
