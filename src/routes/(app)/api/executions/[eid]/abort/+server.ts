import { error, json } from '@sveltejs/kit';
import { abortExecution } from '$lib/server/executions/abort';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

function statusForError(message: string): 404 | 409 | 500 {
  if (/not running/i.test(message)) return 409;
  if (/not found/i.test(message))   return 404;
  return 500;
}

export const POST: RequestHandler = authedHandler(async ({ params }) => {
  try {
    const updated = await abortExecution(params.eid);
    return json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'abortExecution failed';
    throw error(statusForError(message), message);
  }
});
