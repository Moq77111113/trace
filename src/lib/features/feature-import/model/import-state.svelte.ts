import type { BatchPreview, PreviewRowStatus } from '$lib/server/import/types';
import type { CommitOutcome } from '$lib/server/import/commit';
import { type Decision, defaultActionFor } from '../lib/format';

export type ImportState = {
  preview: BatchPreview | null;
  actions: Record<string, Decision>;
  groups:  Record<string, string | null>;
  outcome: CommitOutcome | null;
  error:   string | null;
  setAction(rowId: string, decision: Decision): void;
  setGroup(rowId: string, group: string | null): void;
  applyBulk(status: PreviewRowStatus, decision: Decision): void;
  applyPreview(preview: BatchPreview): void;
  applyOutcome(outcome: CommitOutcome): void;
  reset(): void;
};

export function createImportState(): ImportState {
  const state: ImportState = $state({
    preview: null,
    actions: {},
    groups:  {},
    outcome: null,
    error:   null,

    setAction(rowId, decision) {
      state.actions = { ...state.actions, [rowId]: decision };
    },

    setGroup(rowId, group) {
      state.groups = { ...state.groups, [rowId]: group };
    },

    applyBulk(status, decision) {
      if (!state.preview) return;
      const next = { ...state.actions };
      for (const row of state.preview.rows) {
        if (row.status === status) next[row.rowId] = decision;
      }
      state.actions = next;
    },

    applyPreview(preview) {
      state.preview = preview;
      state.actions = Object.fromEntries(preview.rows.map((r) => [r.rowId, defaultActionFor(r.status)]));
      state.groups  = Object.fromEntries(preview.rows.map((r) => [r.rowId, r.groupName ?? null]));
      state.outcome = null;
      state.error   = null;
    },

    applyOutcome(outcome) {
      state.outcome = outcome;
    },

    reset() {
      state.preview = null;
      state.actions = {};
      state.groups  = {};
      state.outcome = null;
      state.error   = null;
    },
  });

  return state;
}
