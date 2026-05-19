import type { DroppedFile } from '$lib/shared/io/dropped-files';
import type { BatchPreview, PreviewRowStatus } from '$lib/server/import/types';
import type { CommitOutcome } from '$lib/server/import/commit';
import type { ImportApi, UploadInput } from '../api/client';
import { type Decision, defaultActionFor } from '../lib/format';

export class ImportPreviewController {
  preview    = $state<BatchPreview | null>(null);
  actions    = $state<Record<string, Decision>>({});
  groups     = $state<Record<string, string | null>>({});
  outcome    = $state<CommitOutcome | null>(null);
  uploading  = $state(false);
  committing = $state(false);
  error      = $state<string | null>(null);

  readonly #api: ImportApi;
  readonly #onCommitted: ((outcome: CommitOutcome) => void) | undefined;

  constructor(api: ImportApi, opts?: { onCommitted?: (outcome: CommitOutcome) => void }) {
    this.#api = api;
    this.#onCommitted = opts?.onCommitted;
  }

  async upload(items: DroppedFile[]): Promise<void> {
    if (this.uploading) return;
    if (items.length === 0) {
      this.error = 'No .feature files found in the drop';
      return;
    }
    this.error     = null;
    this.uploading = true;

    try {
      const inputs: UploadInput[] = items.map(({ file, path }) => ({
        file,
        presetGroup: parentFolder(path),
      }));
      const preview = await this.#api.upload(inputs);
      this.preview = preview;
      this.actions = Object.fromEntries(
        preview.rows.map((row) => [row.rowId, defaultActionFor(row.status)]),
      );
      this.groups = Object.fromEntries(
        preview.rows.map((row) => [row.rowId, row.groupName ?? null]),
      );
      this.outcome = null;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'upload failed';
    } finally {
      this.uploading = false;
    }
  }

  setAction(rowId: string, decision: Decision): void {
    this.actions = { ...this.actions, [rowId]: decision };
  }

  setGroup(rowId: string, group: string | null): void {
    this.groups = { ...this.groups, [rowId]: group };
  }

  applyBulkToStatus(status: PreviewRowStatus, decision: Decision): void {
    if (!this.preview) return;
    const next = { ...this.actions };
    for (const row of this.preview.rows) {
      if (row.status === status) next[row.rowId] = decision;
    }
    this.actions = next;
  }

  async commit(): Promise<void> {
    if (!this.preview || this.committing) return;
    this.error      = null;
    this.committing = true;

    try {
      const rows = Object.fromEntries(
        this.preview.rows.map((row) => [
          row.rowId,
          { decision: this.actions[row.rowId] ?? 'skip', groupName: this.groups[row.rowId] ?? null },
        ]),
      );
      const outcome = await this.#api.commit(this.preview.previewId, rows);
      this.outcome = outcome;
      this.#onCommitted?.(outcome);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'commit failed';
    } finally {
      this.committing = false;
    }
  }

  reset(): void {
    this.preview = null;
    this.actions = {};
    this.groups  = {};
    this.outcome = null;
    this.error   = null;
  }
}

function parentFolder(path: string): string | null {
  if (!path) return null;
  const idx = path.lastIndexOf('/');
  if (idx <= 0) return null;
  return path.slice(0, idx).split('/').pop() ?? null;
}
