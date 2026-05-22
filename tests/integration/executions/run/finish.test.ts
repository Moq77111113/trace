import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { finishExecution } from '$lib/server/executions/run/finish';
import { mkFeature, mkProject } from '$testing/fixtures';

async function seedRun(content: string) {
  const p = await mkProject({ name: `Fin ${Date.now()}-${Math.random()}` });
  const f = await mkFeature(p.id, { name: 'F', content });
  return startExecution({ featureId: f.id, executedBy: 'Alice' });
}

const twoScenarios = 'Feature: F\n\n  Scenario: A\n    Given x\n\n  Scenario: B\n    When y\n';
const oneScenario  = 'Feature: F\n\n  Scenario: A\n    Given x\n';

describe('finishExecution', () => {
  it('marks final FAILED when any scenario FAILED (PENDING coerced to SKIPPED)', async () => {
    const run = await seedRun(twoScenarios);
    const rows = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
    const [first, second] = rows;
    if (!first || !second) throw new Error('expected two scenario_results rows');

    await db.update(scenarioResults).set({ status: 'PASSED' }).where(eq(scenarioResults.id, first.id));
    await db.update(scenarioResults).set({ status: 'FAILED' }).where(eq(scenarioResults.id, second.id));

    const finished = await finishExecution(run.id);

    expect(finished.status).toBe('FAILED');
    expect(finished.finishedAt).not.toBeNull();
  });

  it('coerces leftover PENDING scenarios to SKIPPED', async () => {
    const run = await seedRun(twoScenarios);

    await finishExecution(run.id);

    const rows = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
    expect(rows.every((r) => r.status === 'SKIPPED')).toBe(true);
  });

  it('is idempotent (second call returns the same finished row)', async () => {
    const run = await seedRun(oneScenario);

    const first  = await finishExecution(run.id);
    const second = await finishExecution(run.id);

    expect(second.id).toBe(first.id);
    expect(second.finishedAt?.getTime()).toBe(first.finishedAt?.getTime());
  });
});
