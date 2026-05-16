import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects, scenarioResults } from '$lib/server/db/schema';
import type { ParseError } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/start';

async function freshFeatureBase(content: string) {
  const [p] = await db
    .insert(projects)
    .values({ name: `Run ${Date.now()}-${Math.random()}` })
    .returning();
  if (!p) throw new Error('seed: project insert failed');

  const [f] = await db
    .insert(features)
    .values({ projectId: p.id, name: 'Login', content })
    .returning();
  if (!f) throw new Error('seed: feature insert failed');

  return { project: p, feature: f };
}

async function setParseErrors(featureId: string, errors: ParseError[]) {
  await db.update(features).set({ parseErrors: errors }).where(eq(features.id, featureId));
}

const twoScenarioFeature =
  'Feature: Login\n\n  Scenario: A\n    Given x\n\n  Scenario: B\n    When y\n';

describe('startExecution', () => {
  it('creates a RUNNING row with one scenario_result per scenario', async () => {
    const { feature } = await freshFeatureBase(twoScenarioFeature);

    const run = await startExecution({
      featureId:   feature.id,
      executedBy:  'Alice',
      environment: 'staging',
    });

    expect(run.status).toBe('IN_PROGRESS');
    expect(run.source).toBe('MANUAL');
    expect(run.executedBy).toBe('Alice');
    expect(run.environment).toBe('staging');
    expect(run.featureContentAtStart).toContain('Feature: Login');

    const results = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, run.id));

    expect(results.map((r) => r.scenarioName).sort()).toEqual(['A', 'B']);
    expect(results.every((r) => r.status === 'PENDING')).toBe(true);
  });

  it('rejects features with parse errors', async () => {
    const { feature } = await freshFeatureBase(twoScenarioFeature);
    await setParseErrors(feature.id, [{ line: 1, message: 'oops' }]);

    await expect(
      startExecution({ featureId: feature.id, executedBy: 'Alice' }),
    ).rejects.toThrow(/parse errors/i);
  });

  it('rejects features with zero scenarios', async () => {
    const { feature } = await freshFeatureBase('Feature: Empty\n');

    await expect(
      startExecution({ featureId: feature.id, executedBy: 'Alice' }),
    ).rejects.toThrow(/no scenarios/i);
  });
});
