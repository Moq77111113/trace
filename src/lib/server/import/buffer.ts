import type { BatchPreview, ImportBuffer } from './types';

const TTL_MS         = 30 * 60 * 1000;
const SWEEP_EVERY_MS = 5  * 60 * 1000;

type Entry = {
  preview: BatchPreview;
  buffers: Map<string, ImportBuffer>;
};

const store = new Map<string, Entry>();

export function putPreview(preview: BatchPreview, buffers: Map<string, ImportBuffer>): void {
  store.set(preview.previewId, { preview, buffers });
}

export function getPreview(previewId: string): Entry | null {
  const entry = store.get(previewId);
  if (!entry) return null;

  if (Date.now() - entry.preview.createdAt.getTime() > TTL_MS) {
    store.delete(previewId);
    return null;
  }

  return entry;
}

export function dropPreview(previewId: string): void {
  store.delete(previewId);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.preview.createdAt.getTime() > TTL_MS) store.delete(id);
  }
}, SWEEP_EVERY_MS).unref();
