import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { finishExecution } from '$lib/server/executions/run/finish';
import { saveScenarioNotes } from '$lib/server/executions/scenario/save-scenario-notes';
import { mkFeature, mkProject } from '../../../fixtures';

async function seedRun() {
  const p = await mkProject({ name: `ScenarioNotes ${Date.now()}-${Math.random()}` });
  const f = await mkFeature(p.id, {
    name:    'F',
    content: 'Feature: F\n\n  Scenario: S\n    Given x\n',
  });
  const run = await startExecution({ featureId: f.id, executedBy: 'Alice' });
  const [scenario] = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
  if (!scenario) throw new Error('seed: scenario_results not created');
  return { run, scenario };
}

describe('saveScenarioNotes', () => {
  it('persists notes on a scenario inside a RUNNING run', async () => {
    const { run, scenario } = await seedRun();

    const updated = await saveScenarioNotes({
      executionId:      run.id,
      scenarioResultId: scenario.id,
      notes:            'Login flicker repro: clear cookies first',
    });

    expect(updated.notes).toBe('Login flicker repro: clear cookies first');
  });

  it('normalises empty/whitespace notes to null', async () => {
    const { run, scenario } = await seedRun();

    await saveScenarioNotes({ executionId: run.id, scenarioResultId: scenario.id, notes: 'first pass' });
    const cleared = await saveScenarioNotes({ executionId: run.id, scenarioResultId: scenario.id, notes: '   ' });

    expect(cleared.notes).toBeNull();
  });

  it('rejects writes on a finished run', async () => {
    const { run, scenario } = await seedRun();
    await finishExecution(run.id);

    await expect(
      saveScenarioNotes({ executionId: run.id, scenarioResultId: scenario.id, notes: 'too late' }),
    ).rejects.toThrow(/not RUNNING/i);
  });

  it('rejects scenario not in this run', async () => {
    const { run } = await seedRun();

    await expect(
      saveScenarioNotes({
        executionId:      run.id,
        scenarioResultId: '00000000-0000-0000-0000-000000000000',
        notes:            'mismatched',
      }),
    ).rejects.toThrow(/not found/i);
  });
});
