import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { commitBatch } from '$lib/server/import/commit';
import { DECISIONS } from '$lib/features/feature-import/lib/format';
import { authedHandler } from '$lib/server/route';
import { resolveLiveExecutor } from '$lib/server/executions/auth';
import type { RequestHandler } from './$types';

const body = z.object({
  previewId: z.string().min(1),
  rows: z.record(
    z.string(),
    z.object({
      decision:  z.enum(DECISIONS),
      groupName: z.string().min(1).nullable(),
    }),
  ),
});

export const POST: RequestHandler = authedHandler(async (event) => {
  const parsed = body.safeParse(await event.request.json().catch(() => null));
  if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'invalid body');

  const editor = resolveLiveExecutor(event);

  try {
    const outcome = await commitBatch({
      previewId: parsed.data.previewId,
      rows:      parsed.data.rows,
      editor,
    });
    return json(outcome);
  } catch (err) {
    throw error(409, err instanceof Error ? err.message : 'commit failed');
  }
});
