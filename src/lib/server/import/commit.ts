import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { saveFeature } from '$lib/server/features/lifecycle/save';
import { findAvailableName, findOrCreateGroup, importFeatureFromContent } from '$lib/server/features/import-create';
import { dropPreview, getPreview } from './buffer';

export const decisionSchema = z.enum(['import', 'skip', 'overwrite', 'rename']);
export type Decision = z.infer<typeof decisionSchema>;

export const commitRowInput = z.object({
  decision:  decisionSchema,
  groupName: z.string().min(1).nullable(),
});
export type CommitRowInput = z.infer<typeof commitRowInput>;

export const commitInput = z.object({
  previewId: z.string().min(1),
  rows:      z.record(z.string(), commitRowInput),
  editor:    z.string().optional(),
});
export type CommitInput = z.infer<typeof commitInput>;

export type CommitFailure = { rowId: string; filename: string; reason: string };

export type CommitOutcome = {
  imported: number;
  skipped:  number;
  failed:   CommitFailure[];
};

const EDITOR_DEFAULT = 'import';

export async function commitBatch(input: CommitInput): Promise<CommitOutcome> {
  const entry = getPreview(input.previewId);
  if (!entry) throw new Error('commitBatch: preview expired or not found');

  const editor   = input.editor && input.editor.length > 0 ? input.editor : EDITOR_DEFAULT;
  const outcome: CommitOutcome = { imported: 0, skipped: 0, failed: [] };

  for (const row of entry.preview.rows) {
    const rowInput = input.rows[row.rowId] ?? { decision: 'skip', groupName: row.groupName };
    const decision = rowInput.decision;
    const groupName = rowInput.groupName;

    if (decision === 'skip') { outcome.skipped += 1; continue; }

    const buf = entry.buffers.get(row.rowId);
    if (!buf) {
      outcome.failed.push({ rowId: row.rowId, filename: row.filename, reason: 'buffer missing' });
      continue;
    }

    const content = buf.bytes.toString('utf-8');

    try {
      if (decision === 'overwrite') {
        if (!row.collidesWithId) {
          throw new Error('overwrite requires a target feature; use rename for in-batch duplicates');
        }
        const current = await db.query.features.findFirst({ where: eq(features.id, row.collidesWithId) });
        if (!current) throw new Error('overwrite target no longer exists');

        const groupId = groupName
          ? await db.transaction((tx) => findOrCreateGroup(tx, entry.preview.projectId, groupName))
          : null;

        const result = await saveFeature({
          featureId:       row.collidesWithId,
          content,
          description:     null,
          expectedVersion: current.version,
          editor,
          groupId,
        });
        if (!result.ok) {
          if (result.reason === 'version-conflict') throw new Error('overwrite blocked by concurrent edit');
          throw new Error('import: feature save rejected by manual-name-collision: ' + result.collisions.join(', '));
        }
      } else if (decision === 'rename') {
        const base = row.featureName?.trim() || row.filename.replace(/\.feature$/i, '') || 'Imported';
        await db.transaction(async (tx) => {
          const safeName = await findAvailableName(tx, entry.preview.projectId, base);
          await importFeatureFromContent(tx, {
            projectId: entry.preview.projectId,
            content,
            renameTo:  safeName,
            groupName,
          });
        });
      } else {
        await db.transaction(async (tx) => {
          await importFeatureFromContent(tx, {
            projectId: entry.preview.projectId,
            content,
            groupName,
          });
        });
      }

      outcome.imported += 1;
    } catch (err) {
      outcome.failed.push({
        rowId:    row.rowId,
        filename: row.filename,
        reason:   err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  dropPreview(input.previewId);

  return outcome;
}
