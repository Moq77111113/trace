import type { BatchPreview } from '$lib/server/import/types';
import type { CommitOutcome } from '$lib/server/import/commit';
import type { Decision } from '../lib/format';

export type UploadInput = { file: File; presetGroup: string | null };
export type CommitRow   = { decision: Decision; groupName: string | null };

export type ImportApi = {
  upload(inputs: UploadInput[]): Promise<BatchPreview>;
  commit(previewId: string, rows: Record<string, CommitRow>): Promise<CommitOutcome>;
};

export function createImportApi(projectId: string): ImportApi {
  const base = `/api/projects/${projectId}/import`;

  return {
    async upload(inputs) {
      const fd = new FormData();
      for (const { file, presetGroup } of inputs) {
        fd.append('files',  file);
        fd.append('groups', presetGroup ?? '');
      }

      const res = await fetch(`${base}/preview`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await readError(res));
      return res.json() as Promise<BatchPreview>;
    },

    async commit(previewId, rows) {
      const res = await fetch(`${base}/commit`, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ previewId, rows }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return res.json() as Promise<CommitOutcome>;
    },
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json() as { message?: string };
    return body.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
