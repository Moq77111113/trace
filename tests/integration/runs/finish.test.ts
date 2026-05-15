import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects, runs, scenarioResults } from '$lib/server/db/schema';
import { startRun } from '$lib/server/runs/start';
import { finishRun } from '$lib/server/runs/finish';

async function seedRun(content: string) {
  const [p] = await db.insert(projects).values({ name: `Fin ${Date.now()}-${Math.random()}` }).returning();
  if (!p) throw new Error('seed: project insert failed');

  const [f] = await db.insert(features).values({ projectId: p.id, name: 'F', content }).returning();
  if (!f) throw new Error('seed: feature insert failed');

  return startRun({ featureId: f.id, executedBy: 'Alice' });
}

const twoScenarios = 'Feature: F\n\n  Scenario: A\n    Given x\n\n  Scenario: B\n    When y\n';
const oneScenario  = 'Feature: F\n\n  Scenario: A\n    Given x\n';

describe('finishRun', () => {
  it('marks final FAILED when any scenario FAILED (PENDING coerced to SKIPPED)', async () => {
    const run = await seedRun(twoScenarios);
    const rows = await db.select().from(scenarioResults).where(eq(scenarioResults.runId, run.id));
    const [first, second] = rows;
    if (!first || !second) throw new Error('expected two scenario_results rows');

    await db.update(scenarioResults).set({ status: 'PASSED' }).where(eq(scenarioResults.id, first.id));
    await db.update(scenarioResults).set({ status: 'FAILED' }).where(eq(scenarioResults.id, second.id));

    const finished = await finishRun(run.id);

    expect(finished.status).toBe('FAILED');
    expect(finished.finishedAt).not.toBeNull();
  });

  it('coerces leftover PENDING scenarios to SKIPPED', async () => {
    const run = await seedRun(twoScenarios);

    await finishRun(run.id);

    const rows = await db.select().from(scenarioResults).where(eq(scenarioResults.runId, run.id));
    expect(rows.every((r) => r.status === 'SKIPPED')).toBe(true);
  });

  it('is idempotent (second call returns the same finished row)', async () => {
    const run = await seedRun(oneScenario);

    const first  = await finishRun(run.id);
    const second = await finishRun(run.id);

    expect(second.id).toBe(first.id);
    expect(second.finishedAt?.getTime()).toBe(first.finishedAt?.getTime());
  });
});
