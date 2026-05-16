import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { commitBatch } from '$lib/server/import/commit';
import { DECISIONS } from '$lib/import/format';
import { authedHandler } from '$lib/server/route';
import { resolveLiveExecutor } from '$lib/server/executions/auth';
import type { RequestHandler } from './$types';

const body = z.object({
  previewId: z.string().min(1),
  decisions: z.record(z.string(), z.enum(DECISIONS)),
});

export const POST: RequestHandler = authedHandler(async (event) => {
  const parsed = body.safeParse(await event.request.json().catch(() => null));
  if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'invalid body');

  const editor = resolveLiveExecutor(event);

  try {
    const outcome = await commitBatch({
      previewId: parsed.data.previewId,
      decisions: parsed.data.decisions,
      editor,
    });
    return json(outcome);
  } catch (err) {
    throw error(409, err instanceof Error ? err.message : 'commit failed');
  }
});
