import type { BatchPreview } from '$lib/server/import/types';
import type { CommitOutcome } from '$lib/server/import/commit';

export function isPreviewResult(data: unknown): data is { preview: BatchPreview } {
  if (typeof data !== 'object' || data === null) return false;
  if (!('preview' in data)) return false;
  return typeof data.preview === 'object' && data.preview !== null;
}

export function isCommitResult(data: unknown): data is { outcome: CommitOutcome } {
  if (typeof data !== 'object' || data === null) return false;
  if (!('outcome' in data)) return false;
  return typeof data.outcome === 'object' && data.outcome !== null;
}
