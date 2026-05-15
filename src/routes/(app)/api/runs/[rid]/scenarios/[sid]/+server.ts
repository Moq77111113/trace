import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { markScenario } from '$lib/server/runs/mark-scenario';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

const Body = z.object({
  status:       z.enum(['PASSED', 'FAILED', 'SKIPPED']),
  durationMs:   z.number().int().nonnegative().optional(),
  logs:         z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

function statusForError(message: string): 404 | 409 | 500 {
  if (/not running/i.test(message)) return 409;
  if (/not found/i.test(message))   return 404;
  return 500;
}

export const PATCH: RequestHandler = authedHandler(async ({ params, request }) => {
  const raw    = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) throw error(400, parsed.error.issues.map((i) => i.message).join('; '));

  try {
    const updated = await markScenario({
      runId:            params.rid,
      scenarioResultId: params.sid,
      status:           parsed.data.status,
      durationMs:       parsed.data.durationMs,
      logs:             parsed.data.logs,
      errorMessage:     parsed.data.errorMessage,
    });

    return json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'markScenario failed';
    throw error(statusForError(message), message);
  }
});
