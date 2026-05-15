import { error } from '@sveltejs/kit';
import { exportFeature } from '$lib/server/features/export';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const out = await exportFeature(params.fid);

  if (!out) throw error(404, 'feature not found');

  return new Response(out.content, {
    headers: {
      'content-type':        `${out.mimeType}; charset=utf-8`,
      'content-disposition': `attachment; filename="${out.filename}"`,
      'cache-control':       'no-store',
    },
  });
};
