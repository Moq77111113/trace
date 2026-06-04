import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { attachments, executions, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { putObject } from '$lib/server/storage/s3';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const uploadAttachmentMetadata = z.object({
  executionId:      z.uuid({ version: 'v7' }),
  scenarioResultId: z.uuid({ version: 'v7' }),
  scenarioResultStepId: z.uuid({ version: 'v7' }).nullable().optional(),
  filename:         z.string().min(1),
  mimeType:         z.string().min(1),
});

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentMetadata> & { body: Buffer };

/**
 * Uploads an attachment blob to S3 inside a RUNNING run and records the row.
 * Refuses uploads when the run is not RUNNING. The route handler is a thin POST
 * wrapper around this function — tests exercise the function directly without
 * needing a dev server.
 */
export async function uploadAttachment(input: UploadAttachmentInput) {
  if (input.body.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(`uploadAttachment: file too large (${input.body.byteLength} > ${MAX_ATTACHMENT_BYTES})`);
  }

  const [run] = await db.select().from(executions).where(eq(executions.id, input.executionId));
  if (!run) throw new Error(`uploadAttachment: run ${input.executionId} not found`);
  if (run.status !== 'IN_PROGRESS') throw new Error(`uploadAttachment: run ${input.executionId} is not RUNNING`);

  const [scenario] = await db.select().from(scenarioResults)
    .where(and(eq(scenarioResults.id, input.scenarioResultId), eq(scenarioResults.executionId, input.executionId)));

  if (!scenario) throw new Error(`uploadAttachment: scenario ${input.scenarioResultId} not found in run ${input.executionId}`);

  const stepId = input.scenarioResultStepId ?? null;
  if (stepId) {
    const [step] = await db.select({ id: scenarioResultSteps.id })
      .from(scenarioResultSteps)
      .where(and(eq(scenarioResultSteps.id, stepId), eq(scenarioResultSteps.scenarioResultId, input.scenarioResultId)));
    if (!step) throw new Error(`uploadAttachment: step ${stepId} not in scenario ${input.scenarioResultId}`);
  }

  const storageKey = stepId
    ? `executions/${input.executionId}/${input.scenarioResultId}/${stepId}/${randomUUID()}-${input.filename}`
    : `executions/${input.executionId}/${input.scenarioResultId}/${randomUUID()}-${input.filename}`;

  await putObject(storageKey, input.body, input.mimeType);

  const [row] = await db.insert(attachments).values({
    executionId:            input.executionId,
    scenarioResultId: input.scenarioResultId,
    scenarioResultStepId: stepId,
    filename:         input.filename,
    mimeType:         input.mimeType,
    sizeBytes:        input.body.byteLength,
    storageKey,
    uploadedBy:       run.executedBy,
  }).returning();

  if (!row) throw new Error('uploadAttachment: insert returned no row');

  return row;
}
