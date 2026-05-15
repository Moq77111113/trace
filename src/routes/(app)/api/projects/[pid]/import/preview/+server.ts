import { error, json } from '@sveltejs/kit';
import { parseBatch } from '$lib/server/import/parse-batch';
import { authedHandler } from '$lib/server/route';
import type { ImportBuffer } from '$lib/server/import/types';
import type { RequestHandler } from './$types';

const MAX_FILES      = 100;
const MAX_BYTES_FILE = 1 * 1024 * 1024;

export const POST: RequestHandler = authedHandler(async ({ request, params }) => {
  const form    = await request.formData();
  const entries = form.getAll('files').filter((e): e is File => e instanceof File);

  if (entries.length === 0)         throw error(400, 'no files uploaded');
  if (entries.length > MAX_FILES)   throw error(413, `max ${MAX_FILES} files per batch — split your import`);

  const inputs: ImportBuffer[] = [];

  for (const file of entries) {
    if (!file.name.toLowerCase().endsWith('.feature')) throw error(400, `unsupported file: ${file.name}`);
    if (file.size > MAX_BYTES_FILE)                    throw error(413, `${file.name} exceeds 1MB`);

    inputs.push({
      filename: file.name,
      bytes:    Buffer.from(await file.arrayBuffer()),
    });
  }

  const preview = await parseBatch(params.pid, inputs);

  return json(preview);
});
