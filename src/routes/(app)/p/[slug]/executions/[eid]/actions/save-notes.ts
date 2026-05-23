import { fail, type RequestEvent } from '@sveltejs/kit';
import { saveScenarioNotes, saveScenarioNotesInput } from '$lib/server/executions/scenario/save-scenario-notes';
import { stringFields } from '$lib/server/forms';
import { requireExecution } from '$lib/server/executions/authz';
import { failureFor } from './failure';

type Params = { slug: string; eid: string };

export async function saveNotes({ request, params, locals }: RequestEvent<Params>) {
  await requireExecution(locals.authz, params.eid, 'execution.run');
  const parsed = saveScenarioNotesInput.safeParse({
    executionId: params.eid,
    ...stringFields(await request.formData()),
  });
  if (!parsed.success) return fail(400, { error: 'invalid-input' });

  try {
    const updated = await saveScenarioNotes(parsed.data);
    return { notes: updated.notes };
  } catch (e) {
    return failureFor(e);
  }
}
