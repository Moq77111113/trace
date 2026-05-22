import { fail, type RequestEvent } from '@sveltejs/kit';
import { parseBatch } from '$lib/server/import/parse-batch';
import { getProjectIdBySlug } from '$lib/server/projects/queries';
import type { ImportBuffer } from '$lib/server/import/types';
import { failureFor } from './failure';

type Params = { slug: string };

const MAX_FILES      = 100;
const MAX_BYTES_FILE = 1 * 1024 * 1024;

export async function preview({ request, params }: RequestEvent<Params>) {
  const projectId = await getProjectIdBySlug(params.slug);
  if (!projectId) return fail(404, { error: 'project not found' });

  const form    = await request.formData();
  const entries = form.getAll('files').filter((e): e is File => e instanceof File);
  const groups  = form.getAll('groups').map((g) => typeof g === 'string' ? g : '');

  if (entries.length === 0)       return fail(400, { error: 'no files uploaded' });
  if (entries.length > MAX_FILES) return fail(413, { error: `max ${MAX_FILES} files per batch` });

  const inputs: ImportBuffer[] = [];
  for (const [i, file] of entries.entries()) {
    if (!file.name.toLowerCase().endsWith('.feature')) return fail(400, { error: `unsupported file: ${file.name}` });
    if (file.size > MAX_BYTES_FILE)                    return fail(413, { error: `${file.name} exceeds 1MB` });

    const preset = (groups[i] ?? '').trim();
    inputs.push({
      filename:    file.name,
      bytes:       Buffer.from(await file.arrayBuffer()),
      presetGroup: preset.length > 0 ? preset : null,
    });
  }

  try {
    const preview = await parseBatch(projectId, inputs);
    return { preview };
  } catch (e) {
    return failureFor(e);
  }
}
