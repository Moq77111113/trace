import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { saveFeature } from '$lib/server/features/save';
import { findAvailableName, findOrCreateGroup, importFeatureFromContent } from '$lib/server/features/import-create';
import { dropPreview, getPreview } from './buffer';

export type Decision = 'import' | 'skip' | 'overwrite' | 'rename';

export type CommitInput = {
  previewId: string;
  decisions: Record<string, Decision>;
  editor?:   string;
};

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
    const decision = input.decisions[row.rowId] ?? 'skip';

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

        const groupId = row.groupName
          ? await db.transaction((tx) => findOrCreateGroup(tx, entry.preview.projectId, row.groupName!))
          : null;

        const result = await saveFeature({
          featureId:       row.collidesWithId,
          content,
          expectedVersion: current.version,
          editor,
          groupId,
        });
        if (result.conflict) throw new Error('overwrite blocked by concurrent edit');
      } else if (decision === 'rename') {
        const base = row.featureName?.trim() || row.filename.replace(/\.feature$/i, '') || 'Imported';
        await db.transaction(async (tx) => {
          const safeName = await findAvailableName(tx, entry.preview.projectId, base);
          await importFeatureFromContent(tx, {
            projectId: entry.preview.projectId,
            content,
            renameTo:  safeName,
            groupName: row.groupName,
          });
        });
      } else {
        await db.transaction(async (tx) => {
          await importFeatureFromContent(tx, {
            projectId: entry.preview.projectId,
            content,
            groupName: row.groupName,
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
