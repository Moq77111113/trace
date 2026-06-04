import { fail, type RequestEvent } from '@sveltejs/kit';
import { saveStepNote, saveStepNoteInput } from '$lib/server/executions/step/save-step-note';
import { stringFields } from '$lib/server/forms';
import { requireExecution } from '$lib/server/executions/authz';
import { failureFor } from './failure';

type Params = { slug: string; eid: string };

export async function saveStepNoteAction({ request, params, locals }: RequestEvent<Params>) {
  await requireExecution(locals.authz, params.eid, 'execution.run');
  const parsed = saveStepNoteInput.safeParse({ executionId: params.eid, ...stringFields(await request.formData()) });
  if (!parsed.success) return fail(400, { error: 'invalid-input' });
  try {
    return { step: await saveStepNote(parsed.data) };
  } catch (e) {
    return failureFor(e);
  }
}
