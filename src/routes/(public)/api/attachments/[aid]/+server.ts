import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { Readable } from 'node:stream';
import { db } from '$lib/server/db/client';
import { attachments } from '$lib/server/db/schema';
import { getObjectStream } from '$lib/server/storage/s3';
import type { RequestHandler } from './$types';

export const GET = (async ({ params }) => {
  const [row] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, params.aid));

  if (!row) throw error(404, 'attachment not found');

  const stream = await getObjectStream(row.storageKey);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'content-type':        row.mimeType,
      'content-length':      String(row.sizeBytes),
      'content-disposition': `inline; filename="${row.filename.replace(/"/g, '')}"`,
      'cache-control':       'private, max-age=60',
    },
  });
}) satisfies RequestHandler;
