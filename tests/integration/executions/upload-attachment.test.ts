import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { scenarioResults } from '$lib/server/db/schema';
import { startExecution } from '$lib/server/executions/start';
import { markScenario } from '$lib/server/executions/mark-scenario';
import { uploadAttachment } from '$lib/server/executions/upload-attachment';
import { mkFeature, mkProject } from '../../fixtures';

async function seedFailedScenario() {
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
  it('refuses upload when scenario is not FAILED', async () => {
    const { run, scenario } = await seedFailedScenario();

    await expect(uploadAttachment({
      executionId:            run.id,
      scenarioResultId: scenario.id,
      filename:         'a.txt',
      mimeType:         'text/plain',
      body:             Buffer.from('hi'),
    })).rejects.toThrow(/FAILED scenarios/i);
  });

  it('uploads and records an attachment after FAIL', async () => {
    const { run, scenario } = await seedFailedScenario();

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

  it('refuses files over the size limit', async () => {
    const { run, scenario } = await seedFailedScenario();
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
