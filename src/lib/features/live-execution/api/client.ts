export type Verdict = 'PASSED' | 'FAILED' | 'SKIPPED';

export type UploadedAttachment = {
  id:        string;
  filename:  string;
  mimeType:  string;
  sizeBytes: number;
};

export class RunsApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body    = await res.json().catch(() => null);
  const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
    ? body.message
    : `${fallback} (${res.status})`;
  return message;
}

function isUploadedAttachment(v: unknown): v is UploadedAttachment {
  return !!v
    && typeof v === 'object'
    && 'id'        in v && typeof v.id        === 'string'
    && 'filename'  in v && typeof v.filename  === 'string'
    && 'sizeBytes' in v && typeof v.sizeBytes === 'number'
    && 'mimeType'  in v && typeof v.mimeType  === 'string';
}

/** Bundles the three HTTP edges a live run drives, scoped to one run id. */
export function createExecutionApi(executionId: string) {
  return {
    async patchScenarioStatus(scenarioId: string, status: Verdict): Promise<void> {
      const res = await fetch(`/api/executions/${executionId}/scenarios/${scenarioId}`, {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      if (!res.ok) throw new RunsApiError(await readErrorMessage(res, 'Save failed'), res.status);
    },

    async patchNotes(notes: string | null): Promise<void> {
      const res = await fetch(`/api/executions/${executionId}/notes`, {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ notes }),
      });
      if (!res.ok) throw new RunsApiError(await readErrorMessage(res, 'Notes not saved'), res.status);
    },

    async postAbort(): Promise<void> {
      const res = await fetch(`/api/executions/${executionId}/abort`, { method: 'POST' });
      if (!res.ok) throw new RunsApiError(await readErrorMessage(res, 'Abort failed'), res.status);
    },

    async uploadScenarioAttachment(scenarioId: string, file: File): Promise<UploadedAttachment> {
      const form = new FormData();
      form.set('file', file);

      const res = await fetch(`/api/executions/${executionId}/scenarios/${scenarioId}/attachments`, {
        method: 'POST',
        body:   form,
      });
      if (!res.ok) throw new RunsApiError(await readErrorMessage(res, `Upload failed for ${file.name}`), res.status);

      const row = await res.json();
      if (!isUploadedAttachment(row)) throw new RunsApiError('Upload response missing fields', 500);
      return row;
    },
  };
}

export type ExecutionApi = ReturnType<typeof createExecutionApi>;
