import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { streamProjectZip } from '$lib/server/projects/export-zip';
import { requireProjectById } from '$lib/server/projects/authz';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = authedHandler(async ({ params, locals }) => {
  await requireProjectById(locals.authz, params.pid, 'feature.view');
  const out = await streamProjectZip(params.pid);

  if (!out) throw error(404, 'project has no exportable features');

  return new Response(Readable.toWeb(out.stream) as ReadableStream, {
    headers: {
      'content-type':        'application/zip',
      'content-disposition': `attachment; filename="${out.filename}"`,
      'cache-control':       'no-store',
    },
  });
});
