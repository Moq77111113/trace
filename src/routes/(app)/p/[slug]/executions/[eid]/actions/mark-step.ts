import { fail, type RequestEvent } from '@sveltejs/kit';
import { markStep, markStepInput } from '$lib/server/executions/step/mark-step';
import { stringFields } from '$lib/server/forms';
import { requireExecution } from '$lib/server/executions/authz';
import { failureFor } from './failure';

type Params = { slug: string; eid: string };

export async function markStepAction({ request, params, locals }: RequestEvent<Params>) {
  await requireExecution(locals.authz, params.eid, 'execution.run');
  const parsed = markStepInput.safeParse({ executionId: params.eid, ...stringFields(await request.formData()) });
  if (!parsed.success) return fail(400, { error: 'invalid-input' });
  try {
    return { step: await markStep(parsed.data) };
  } catch (e) {
    return failureFor(e);
  }
}
