import { describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { mkProject, mkFeature } from '$testing/fixtures';
import { startExecution } from '$lib/server/executions/run/start';
import { finishExecution } from '$lib/server/executions/run/finish';
import { markScenario } from '$lib/server/executions/scenario/mark-scenario';

function only<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error('test: expected exactly one row');
  return row;
}

async function runWithScenario() {
  const project = await mkProject({ name: `Mark ${Date.now()}-${Math.random()}` });
  const feature = await mkFeature(project.id, {
    name: 'F', content: 'Feature: F\n  Scenario: S\n    Given a\n    Then b\n',
  });
  const run = await startExecution({ featureId: feature.id, executedBy: 'tester' });
  const scenario = only(await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id)));
  return { run, scenario };
}

describe('markScenario fill-and-derive', () => {
  it('PASSED fills all pending steps and derives PASSED', async () => {
    const { run, scenario } = await runWithScenario();
    await markScenario({ executionId: run.id, scenarioResultId: scenario.id, status: 'PASSED' });

    const steps = await db.select().from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.scenarioResultId, scenario.id)).orderBy(asc(scenarioResultSteps.position));
    const after = only(await db.select().from(scenarioResults).where(eq(scenarioResults.id, scenario.id)));

    expect(steps.every((s) => s.verdict === 'PASSED')).toBe(true);
    expect(after.status).toBe('PASSED');
  });

  it('leaves an already-FAILED step untouched and derives FAILED', async () => {
    const { run, scenario } = await runWithScenario();
    const steps = await db.select().from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.scenarioResultId, scenario.id)).orderBy(asc(scenarioResultSteps.position));
    const step0 = only(steps);
    await db.update(scenarioResultSteps).set({ verdict: 'FAILED' }).where(eq(scenarioResultSteps.id, step0.id));

    await markScenario({ executionId: run.id, scenarioResultId: scenario.id, status: 'PASSED' });

    const after = await db.select().from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.scenarioResultId, scenario.id)).orderBy(asc(scenarioResultSteps.position));
    const sc = only(await db.select().from(scenarioResults).where(eq(scenarioResults.id, scenario.id)));

    expect(only(after).verdict).toBe('FAILED');
    expect(after[1]?.verdict).toBe('PASSED');
    expect(sc.status).toBe('FAILED');
  });

  it('refuses to write into a finished run', async () => {
    const { run, scenario } = await runWithScenario();
    await finishExecution(run.id);
    await expect(markScenario({ executionId: run.id, scenarioResultId: scenario.id, status: 'PASSED' }))
      .rejects.toThrow(/not RUNNING/);
  });

  it('refuses a scenario that does not belong to the run', async () => {
    const a = await runWithScenario();
    const b = await runWithScenario();
    await expect(markScenario({ executionId: a.run.id, scenarioResultId: b.scenario.id, status: 'PASSED' }))
      .rejects.toThrow(/not found/);
  });
});
