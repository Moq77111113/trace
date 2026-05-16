import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { features, projects } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/start';
import { finishExecution } from '$lib/server/executions/finish';
import { saveNotes } from '$lib/server/executions/save-notes';

async function seedRun() {
  const [p] = await db.insert(projects).values({ name: `Notes ${Date.now()}-${Math.random()}` }).returning();
  if (!p) throw new Error('seed: project insert failed');

  const [f] = await db.insert(features).values({
    projectId: p.id,
    name:      'F',
    content:   'Feature: F\n\n  Scenario: S\n    Given x\n',
  }).returning();
  if (!f) throw new Error('seed: feature insert failed');

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
