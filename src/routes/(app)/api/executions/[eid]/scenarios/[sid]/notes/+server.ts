import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { saveScenarioNotes } from '$lib/server/executions/scenario/save-scenario-notes';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

const Body = z.object({ notes: z.string().nullable() });

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
    const updated = await saveScenarioNotes({
      executionId:      params.eid,
      scenarioResultId: params.sid,
      notes:            parsed.data.notes,
    });
    return json({ notes: updated.notes });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'saveScenarioNotes failed';
    throw error(statusForError(message), message);
  }
});
