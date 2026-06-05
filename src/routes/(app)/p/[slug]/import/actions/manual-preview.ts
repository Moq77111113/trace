import { fail, type RequestEvent } from '@sveltejs/kit';
import { requireProject } from '$lib/server/projects/authz';
import { parseManualImport } from '$lib/server/import/manual/parse';

type Params = { slug: string };

const MAX_BYTES = 5 * 1024 * 1024;

/** Parse an uploaded manual-corpus file and return the IR + grouping guess for the preview UI. */
export async function manualPreview({ request, params, locals }: RequestEvent<Params>) {
  const project = await requireProject(locals.authz, params.slug, 'feature.author');

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return fail(400, { error: 'no file uploaded' });
  if (file.size > MAX_BYTES)   return fail(413, { error: 'file exceeds 5MB' });

  const result = await parseManualImport(project.id, {
    filename: file.name,
    bytes:    Buffer.from(await file.arrayBuffer()),
  });

  if (result.sourceId === null) return fail(400, { error: 'unsupported file format' });
  return { manualPreview: result };
}
