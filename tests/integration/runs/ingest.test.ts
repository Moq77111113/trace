import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects, scenarioResults } from '$lib/server/db/schema';
import { ingestRun } from '$lib/server/runs/ingest';
import type { IngestedRun } from '$lib/server/runs/cucumber-json/types';

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

function parsed(featureName: string, scenarios: IngestedRun['scenarios']): IngestedRun {
  return { featureName, scenarios, unknownCount: 0, warnings: [] };
}

describe('ingestRun', () => {
  it('writes a finished run with derived status and scenario_results', async () => {
    const { project, feature } = await seedProjectWithFeature();

    const res = await ingestRun({
      projectId:   project.id,
      executedBy:  'ci-token-1',
      environment: 'staging',
      parsed: parsed('Login', [
        { name: 'A', status: 'FAILED', durationMs: 200, logs: null, errorMessage: 'oops' },
      ]),
    });

    expect(res.run.source).toBe('CI');
    expect(res.run.status).toBe('FAILED');
    expect(res.run.finishedAt).not.toBeNull();
    expect(res.run.featureContentAtRun).toBe(feature.content);
    expect(res.scenariosMatched).toBe(1);

    const rows = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.runId, res.run.id));
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row?.errorMessage).toBe('oops');
    expect(row?.durationMs).toBe(200);
  });

  it('matches feature case-insensitively', async () => {
    const { project } = await seedProjectWithFeature('Login');

    const res = await ingestRun({
      projectId:  project.id,
      executedBy: 'ci',
      parsed: parsed('LOGIN', [
        { name: 'A', status: 'PASSED', durationMs: 100, logs: null, errorMessage: null },
      ]),
    });

    expect(res.run.status).toBe('PASSED');
  });

  it('errors when no feature matches in the project', async () => {
    const { project } = await seedProjectWithFeature('Login');

    await expect(
      ingestRun({
        projectId:  project.id,
        executedBy: 'ci',
        parsed: parsed('Unknown', [
          { name: 'A', status: 'PASSED', durationMs: 100, logs: null, errorMessage: null },
        ]),
      }),
    ).rejects.toThrow(/no feature matching/i);
  });
});
