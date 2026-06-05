import type { ImportIR } from '$lib/shared/import-manual/ir';

const TTL_MS         = 30 * 60 * 1000;
const SWEEP_EVERY_MS = 5  * 60 * 1000;

type Entry = { projectId: string; ir: ImportIR; createdAt: number };

const store = new Map<string, Entry>();

/** Buffer a parsed IR under a preview id for the follow-up commit request. */
export function putManualPreview(previewId: string, projectId: string, ir: ImportIR): void {
  store.set(previewId, { projectId, ir, createdAt: Date.now() });
}

/** Read a buffered preview, or null when missing or expired. */
export function getManualPreview(previewId: string): Entry | null {
  const entry = store.get(previewId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) { store.delete(previewId); return null; }
  return entry;
}

/** Drop a buffered preview after commit. */
export function dropManualPreview(previewId: string): void {
  store.delete(previewId);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) if (now - entry.createdAt > TTL_MS) store.delete(id);
}, SWEEP_EVERY_MS).unref();
