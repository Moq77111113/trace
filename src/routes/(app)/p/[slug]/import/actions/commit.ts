import { fail, type RequestEvent } from '@sveltejs/kit';
import { commitBatch, commitInput } from '$lib/server/import/commit';
import { requireProject } from '$lib/server/projects/authz';
import { resolveLiveExecutor } from '$lib/server/executions/executor';
import { failureFor } from './failure';

type Params = { slug: string };

export async function commit(event: RequestEvent<Params>) {
  await requireProject(event.locals.authz, event.params.slug, 'feature.author');
  const form     = await event.request.formData();
  const rowsRaw  = form.get('rows');
  const previewId = form.get('previewId');

  if (typeof previewId !== 'string') return fail(400, { error: 'previewId required' });
  if (typeof rowsRaw   !== 'string') return fail(400, { error: 'rows required' });

  let rowsParsed: unknown;
  try {
    rowsParsed = JSON.parse(rowsRaw);
  } catch {
    return fail(400, { error: 'rows must be valid JSON' });
  }

  const parsed = commitInput.safeParse({
    previewId,
    rows:   rowsParsed,
    editor: resolveLiveExecutor(event),
  });
  if (!parsed.success) return fail(400, { error: 'invalid commit payload' });

  try {
    const outcome = await commitBatch(parsed.data);
    return { outcome };
  } catch (e) {
    return failureFor(e);
  }
}
