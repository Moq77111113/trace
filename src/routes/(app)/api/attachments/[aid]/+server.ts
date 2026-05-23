import { Readable } from 'node:stream';
import { getObjectStream } from '$lib/server/storage/s3';
import { requireAttachment } from '$lib/server/executions/authz';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = authedHandler(async ({ params, locals }) => {
  const row = await requireAttachment(locals.authz, params.aid, 'execution.review');

  const stream = await getObjectStream(row.storageKey);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'content-type':        row.mimeType,
      'content-length':      String(row.sizeBytes),
      'content-disposition': `inline; filename="${row.filename.replace(/"/g, '')}"`,
      'cache-control':       'private, max-age=60',
    },
  });
});
