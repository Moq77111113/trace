import { describe, it, expect } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { attachments, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/run/start';
import { markScenario } from '$lib/server/executions/scenario/mark-scenario';
import { uploadAttachment } from '$lib/server/executions/scenario/upload-attachment';
import { mkFeature, mkProject } from '$testing/fixtures';

async function seedRun() {
  const p = await mkProject({ name: `Att ${Date.now()}-${Math.random()}` });
  const f = await mkFeature(p.id, {
    name:    'F',
    content: 'Feature: F\n\n  Scenario: S\n    Given x\n',
  });

  const run = await startExecution({ featureId: f.id, executedBy: 'Alice' });
  const [scenario] = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
  if (!scenario) throw new Error('seed: scenario row missing');

  return { run, scenario };
}

describe('uploadAttachment', () => {
  it('accepts uploads on a PENDING scenario (no FAILED gate)', async () => {
    const { run, scenario } = await seedRun();

    const row = await uploadAttachment({
      executionId:      run.id,
      scenarioResultId: scenario.id,
      filename:         'before-decision.png',
      mimeType:         'image/png',
      body:             Buffer.from('fake-png-bytes'),
    });

    expect(row.scenarioResultId).toBe(scenario.id);
  });

  it('uploads and records an attachment after FAIL', async () => {
    const { run, scenario } = await seedRun();

    await markScenario({ executionId: run.id, scenarioResultId: scenario.id, status: 'FAILED' });

    const row = await uploadAttachment({
      executionId:            run.id,
      scenarioResultId: scenario.id,
      filename:         'logs.txt',
      mimeType:         'text/plain',
      body:             Buffer.from('crash trace'),
    });

    expect(row.filename).toBe('logs.txt');
    expect(row.sizeBytes).toBe(11);
    expect(row.storageKey).toMatch(new RegExp(`^executions/${run.id}/${scenario.id}/.+-logs\\.txt$`));
  });

  it('pins an attachment to a step when scenarioResultStepId is given', async () => {
    const { run, scenario } = await seedRun();

    const [step] = await db.select().from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.scenarioResultId, scenario.id))
      .orderBy(asc(scenarioResultSteps.position));
    if (!step) throw new Error('seed: scenario step row missing');

    const row = await uploadAttachment({
      executionId:          run.id,
      scenarioResultId:     scenario.id,
      scenarioResultStepId: step.id,
      filename:             'shot.png',
      mimeType:             'image/png',
      body:                 Buffer.from('x'),
    });

    const [saved] = await db.select().from(attachments).where(eq(attachments.id, row.id));
    if (!saved) throw new Error('attachment row missing');

    expect(saved.scenarioResultStepId).toBe(step.id);
  });

  it('refuses files over the size limit', async () => {
    const { run, scenario } = await seedRun();
    await markScenario({ executionId: run.id, scenarioResultId: scenario.id, status: 'FAILED' });

    const tooBig = Buffer.alloc(10 * 1024 * 1024 + 1);

    await expect(uploadAttachment({
      executionId:            run.id,
      scenarioResultId: scenario.id,
      filename:         'huge.bin',
      mimeType:         'application/octet-stream',
      body:             tooBig,
    })).rejects.toThrow(/too large/i);
  });
});
