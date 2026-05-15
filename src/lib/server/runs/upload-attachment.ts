import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { attachments, runs, scenarioResults } from '$lib/server/db/schema';
import { putObject } from '$lib/server/storage/s3';

export type UploadAttachmentInput = {
  runId:            string;
  scenarioResultId: string;
  filename:         string;
  mimeType:         string;
  body:             Buffer;
};

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * Validates that the target scenario is in a FAILED state inside a RUNNING run,
 * uploads the blob to S3, and records the attachment row. The route handler is
 * a thin POST wrapper around this function — tests exercise the function
 * directly without needing a dev server.
 */
export async function uploadAttachment(input: UploadAttachmentInput) {
  if (input.body.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(`uploadAttachment: file too large (${input.body.byteLength} > ${MAX_ATTACHMENT_BYTES})`);
  }

  const [run] = await db.select().from(runs).where(eq(runs.id, input.runId));
  if (!run) throw new Error(`uploadAttachment: run ${input.runId} not found`);
  if (run.status !== 'RUNNING') throw new Error(`uploadAttachment: run ${input.runId} is not RUNNING`);

  const [scenario] = await db.select().from(scenarioResults)
    .where(and(eq(scenarioResults.id, input.scenarioResultId), eq(scenarioResults.runId, input.runId)));

  if (!scenario) throw new Error(`uploadAttachment: scenario ${input.scenarioResultId} not found in run ${input.runId}`);
  if (scenario.status !== 'FAILED') {
    throw new Error('uploadAttachment: attachments are only allowed on FAILED scenarios');
  }

  const storageKey = `runs/${input.runId}/${input.scenarioResultId}/${randomUUID()}-${input.filename}`;

  await putObject(storageKey, input.body, input.mimeType);

  const [row] = await db.insert(attachments).values({
    runId:            input.runId,
    scenarioResultId: input.scenarioResultId,
    filename:         input.filename,
    mimeType:         input.mimeType,
    sizeBytes:        input.body.byteLength,
    storageKey,
    uploadedBy:       run.executedBy,
  }).returning();

  if (!row) throw new Error('uploadAttachment: insert returned no row');

  return row;
}
