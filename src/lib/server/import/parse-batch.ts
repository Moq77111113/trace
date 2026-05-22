import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import { extractGroupName } from '$lib/features/feature-import/lib/group-meta';
import { stripTraceTag } from '$lib/features/feature-import/lib/trace-tag';
import { putPreview } from './buffer';
import type { BatchPreview, ImportBuffer, PreviewRow, PreviewRowStatus } from './types';

export async function parseBatch(projectId: string, inputs: ImportBuffer[]): Promise<BatchPreview> {
  const existing = await db.select({ id: features.id, name: features.name })
    .from(features)
    .where(and(eq(features.projectId, projectId), eq(features.archived, false)));

  const dbByLowerName    = new Map(existing.map((f) => [f.name.toLowerCase(), f.id]));
  const seenInBatchLower = new Set<string>();

  const rows:    PreviewRow[]               = [];
  const buffers: Map<string, ImportBuffer>  = new Map();

  for (const input of inputs) {
    const rowId = randomUUID();

    const content    = stripTraceTag(input.bytes.toString('utf-8'));
    const sanitized: ImportBuffer = { ...input, bytes: Buffer.from(content, 'utf-8') };
    buffers.set(rowId, sanitized);

    const parsed    = parse(content);
    const groupName = extractGroupName(content) ?? input.presetGroup;
    const lower     = parsed.name?.toLowerCase() ?? null;

    const collidesDbId   = lower ? dbByLowerName.get(lower)    ?? null : null;
    const collidesInBatch = lower ? seenInBatchLower.has(lower)        : false;

    if (lower) seenInBatchLower.add(lower);

    const status: PreviewRowStatus =
      parsed.errors.length > 0          ? 'parse-error' :
      collidesDbId || collidesInBatch   ? 'collision'   :
                                          'new';

    rows.push({
      rowId,
      filename:       input.filename,
      featureName:    parsed.name,
      groupName,
      scenarioCount:  parsed.scenarios.length,
      tags:           parsed.tags,
      status,
      parseErrors:    parsed.errors,
      collidesWithId: collidesDbId,
    });
  }

  const preview: BatchPreview = {
    previewId: randomUUID(),
    projectId,
    rows,
    summary: {
      new:         rows.filter((r) => r.status === 'new').length,
      collisions:  rows.filter((r) => r.status === 'collision').length,
      parseErrors: rows.filter((r) => r.status === 'parse-error').length,
      total:       rows.length,
    },
    createdAt: new Date(),
  };

  putPreview(preview, buffers);

  return preview;
}
