import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { markScenario } from '$lib/server/executions/mark-scenario';
import { mkFeature, mkProject } from '../../fixtures';

async function seedRun() {
  const p = await mkProject({ name: `Mark ${Date.now()}-${Math.random()}` });
  const f = await mkFeature(p.id, {
    name:    'F',
    content: 'Feature: F\n\n  Scenario: S\n    Given x\n',
  });

  const run = await startExecution({ featureId: f.id, executedBy: 'Alice' });
  const [scenario] = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
  if (!scenario) throw new Error('seed: scenario_results not created');

  return { project: p, feature: f, run, scenario };
}

describe('markScenario', () => {
  it('updates scenario status + duration', async () => {
    const { run, scenario } = await seedRun();

    const updated = await markScenario({ executionId: run.id, scenarioResultId: scenario.id, status: 'PASSED', durationMs: 1200 });

    expect(updated.status).toBe('PASSED');
    expect(updated.durationMs).toBe(1200);
  });

  it('rejects when run is not RUNNING', async () => {
    const { run, scenario } = await seedRun();
    await db.update(executions).set({ status: 'PASSED', finishedAt: new Date() }).where(eq(executions.id, run.id));

    await expect(
      markScenario({ executionId: run.id, scenarioResultId: scenario.id, status: 'PASSED' }),
    ).rejects.toThrow(/not running/i);
  });

  it('rejects scenario not in this run', async () => {
    const { run } = await seedRun();

    await expect(
      markScenario({ executionId: run.id, scenarioResultId: '00000000-0000-0000-0000-000000000000', status: 'PASSED' }),
    ).rejects.toThrow(/not found/i);
  });
});
