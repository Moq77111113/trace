import { error, json } from '@sveltejs/kit';
import { uploadAttachment } from '$lib/server/runs/upload-attachment';
import type { RequestHandler } from './$types';

function statusForError(message: string): 400 | 404 | 409 | 413 | 500 {
  if (/too large/i.test(message))       return 413;
  if (/not running/i.test(message))     return 409;
  if (/only allowed on/i.test(message)) return 409;
  if (/not found/i.test(message))       return 404;
  return 500;
}

export const POST = (async ({ params, request }) => {
  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) throw error(400, 'file required (multipart field "file")');
  if (file.size === 0)         throw error(400, 'file is empty');

  const body     = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'application/octet-stream';

  try {
    const row = await uploadAttachment({
      runId:            params.rid,
      scenarioResultId: params.sid,
      filename:         file.name,
      mimeType,
      body,
    });
    return json(row, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'upload failed';
    throw error(statusForError(message), message);
  }
}) satisfies RequestHandler;
