import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { commitBatch } from '$lib/server/import/commit';
import { DECISIONS } from '$lib/import/format';
import type { RequestHandler } from './$types';

const body = z.object({
  previewId: z.string().min(1),
  decisions: z.record(z.string(), z.enum(DECISIONS)),
  editor:    z.string().trim().min(1).max(100).optional(),
});

export const POST: RequestHandler = async ({ request }) => {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'invalid body');

  const { previewId, decisions, editor } = parsed.data;

  try {
    const outcome = await commitBatch(
      editor ? { previewId, decisions, editor } : { previewId, decisions },
    );
    return json(outcome);
  } catch (err) {
    throw error(409, err instanceof Error ? err.message : 'commit failed');
  }
};
