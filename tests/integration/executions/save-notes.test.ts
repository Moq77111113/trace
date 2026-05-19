import { describe, it, expect } from 'vitest';
import { startExecution } from '$lib/server/executions/start';
import { finishExecution } from '$lib/server/executions/finish';
import { saveNotes } from '$lib/server/executions/save-notes';
import { mkFeature, mkProject } from '../../fixtures';

async function seedRun() {
  const p = await mkProject({ name: `Notes ${Date.now()}-${Math.random()}` });
  const f = await mkFeature(p.id, {
    name:    'F',
    content: 'Feature: F\n\n  Scenario: S\n    Given x\n',
  });
  return startExecution({ featureId: f.id, executedBy: 'Alice' });
}

describe('saveNotes', () => {
  it('persists notes on a RUNNING run', async () => {
    const run = await seedRun();

    const updated = await saveNotes({ executionId: run.id, notes: 'Saw a 502 on retry' });

    expect(updated.notes).toBe('Saw a 502 on retry');
  });

  it('normalises empty/whitespace notes to null', async () => {
    const run = await seedRun();

    await saveNotes({ executionId: run.id, notes: 'first pass' });
    const cleared = await saveNotes({ executionId: run.id, notes: '   ' });

    expect(cleared.notes).toBeNull();
  });

  it('rejects writes on a finished run', async () => {
    const run = await seedRun();
    await finishExecution(run.id);

    await expect(saveNotes({ executionId: run.id, notes: 'too late' }))
      .rejects.toThrow(/not RUNNING/i);
  });
});
