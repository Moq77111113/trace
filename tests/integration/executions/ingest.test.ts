import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects, scenarioResults } from '$lib/server/db/schema';
import { ingestExecution } from '$lib/server/executions/ingest';
import type { IngestedExecution } from '$lib/server/executions/cucumber-json/types';

async function seedProjectWithFeature(featureName = 'Login') {
  const [p] = await db
    .insert(projects)
    .values({ name: `Ingest ${Date.now()}-${Math.random()}` })
    .returning();
  if (!p) throw new Error('seed: project insert failed');

  const [f] = await db
    .insert(features)
    .values({
      projectId: p.id,
      name:      featureName,
      content:   `Feature: ${featureName}\n\n  Scenario: A\n    Given x\n`,
    })
    .returning();
  if (!f) throw new Error('seed: feature insert failed');

  return { project: p, feature: f };
}

function parsed(featureName: string, scenarios: IngestedExecution['scenarios']): IngestedExecution {
  return { featureName, scenarios, unknownCount: 0, warnings: [] };
}

describe('ingestExecution', () => {
  it('writes a finished run with derived status and scenario_results', async () => {
    const { project, feature } = await seedProjectWithFeature();

    const res = await ingestExecution({
      projectId:   project.id,
      executedBy:  'ci-token-1',
      environment: 'staging',
      parsed: parsed('Login', [
        { name: 'A', status: 'FAILED', durationMs: 200, logs: null, errorMessage: 'oops' },
      ]),
    });

    expect(res.execution.source).toBe('CI');
    expect(res.execution.status).toBe('FAILED');
    expect(res.execution.finishedAt).not.toBeNull();
    expect(res.execution.featureContentAtStart).toBe(feature.content);
    expect(res.scenariosMatched).toBe(1);

    const rows = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.executionId, res.execution.id));
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row?.errorMessage).toBe('oops');
    expect(row?.durationMs).toBe(200);
  });

  it('matches feature case-insensitively', async () => {
    const { project } = await seedProjectWithFeature('Login');

    const res = await ingestExecution({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: parsed('LOGIN', [
        { name: 'A', status: 'PASSED', durationMs: 100, logs: null, errorMessage: null },
      ]),
    });

    expect(res.execution.status).toBe('PASSED');
  });

  it('errors when no feature matches in the project', async () => {
    const { project } = await seedProjectWithFeature('Login');

    await expect(
      ingestExecution({
        projectId:  project.id,
        executedBy: 'ci',
        parsed: parsed('Unknown', [
          { name: 'A', status: 'PASSED', durationMs: 100, logs: null, errorMessage: null },
        ]),
      }),
    ).rejects.toThrow(/no feature matching/i);
  });
});
