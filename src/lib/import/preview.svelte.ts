import type { BatchPreview, PreviewRowStatus } from '$lib/server/import/types';
import type { CommitOutcome } from '$lib/server/import/commit';
import type { ImportApi } from './api';
import { type Decision, defaultActionFor } from './format';

export class ImportPreviewController {
  preview    = $state<BatchPreview | null>(null);
  actions    = $state<Record<string, Decision>>({});
  outcome    = $state<CommitOutcome | null>(null);
  uploading  = $state(false);
  committing = $state(false);
  error      = $state<string | null>(null);

  readonly #api: ImportApi;

  constructor(api: ImportApi) { this.#api = api; }

  async upload(files: File[]): Promise<void> {
    if (this.uploading) return;
    this.error     = null;
    this.uploading = true;

    try {
      const preview = await this.#api.upload(files);
      this.preview = preview;
      this.actions = Object.fromEntries(
        preview.rows.map((row) => [row.rowId, defaultActionFor(row.status)]),
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
      this.outcome = await this.#api.commit(this.preview.previewId, this.actions);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'commit failed';
    } finally {
      this.committing = false;
    }
  }

  reset(): void {
    this.preview = null;
    this.actions = {};
    this.outcome = null;
    this.error   = null;
  }
}
