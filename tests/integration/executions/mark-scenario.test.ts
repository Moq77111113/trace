import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects, executions, scenarioResults } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/start';
import { markScenario } from '$lib/server/executions/mark-scenario';

async function seedRun() {
  const [p] = await db.insert(projects).values({ name: `Mark ${Date.now()}-${Math.random()}` }).returning();
  if (!p) throw new Error('seed: project insert failed');

  const [f] = await db.insert(features).values({
    projectId: p.id,
    name:      'F',
    content:   'Feature: F\n\n  Scenario: S\n    Given x\n',
  }).returning();
  if (!f) throw new Error('seed: feature insert failed');

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
