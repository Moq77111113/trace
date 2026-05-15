import type { BatchPreview } from '$lib/server/import/types';
import type { CommitOutcome } from '$lib/server/import/commit';
import type { Decision } from './format';

export type ImportApi = {
  upload(files: File[]): Promise<BatchPreview>;
  commit(previewId: string, decisions: Record<string, Decision>): Promise<CommitOutcome>;
};

export function createImportApi(projectId: string): ImportApi {
  const base = `/api/projects/${projectId}/import`;

  return {
    async upload(files) {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);

      const res = await fetch(`${base}/preview`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await readError(res));
      return res.json() as Promise<BatchPreview>;
    },

    async commit(previewId, decisions) {
      const res = await fetch(`${base}/commit`, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ previewId, decisions }),
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
