import { describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { mkProject, mkFeature } from '$testing/fixtures';
import { startExecution } from '$lib/server/executions/run/start';
import { saveStepNote } from '$lib/server/executions/step/save-step-note';

async function firstStep() {
  const project = await mkProject({ name: `Note ${Date.now()}-${Math.random()}` });
  const feature = await mkFeature(project.id, { name: 'F', content: 'Feature: F\n  Scenario: S\n    Given a\n' });
  const run = await startExecution({ featureId: feature.id, executedBy: 'tester' });

  const [scenario] = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
  if (!scenario) throw new Error('expected a scenario result');

  const [step] = await db.select().from(scenarioResultSteps)
    .where(eq(scenarioResultSteps.scenarioResultId, scenario.id)).orderBy(asc(scenarioResultSteps.position));
  if (!step) throw new Error('expected a scenario result step');

  return { run, step };
}

async function readNote(stepId: string) {
  const [after] = await db.select().from(scenarioResultSteps).where(eq(scenarioResultSteps.id, stepId));
  if (!after) throw new Error('expected the step to still exist');
  return after.note;
}

describe('saveStepNote', () => {
  it('persists a note and normalises blank to null', async () => {
    const { run, step } = await firstStep();

    await saveStepNote({ executionId: run.id, scenarioResultStepId: step.id, note: 'looked wrong' });
    expect(await readNote(step.id)).toBe('looked wrong');

    await saveStepNote({ executionId: run.id, scenarioResultStepId: step.id, note: '   ' });
    expect(await readNote(step.id)).toBeNull();
  });
});
