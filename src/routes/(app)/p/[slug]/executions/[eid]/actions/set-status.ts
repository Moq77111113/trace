import { fail, type RequestEvent } from '@sveltejs/kit';
import { markScenario, markScenarioInput } from '$lib/server/executions/scenario/mark-scenario';
import { stringFields } from '$lib/server/forms';
import { requireExecution } from '$lib/server/executions/authz';
import { failureFor } from './failure';

type Params = { slug: string; eid: string };

export async function setStatus({ request, params, locals }: RequestEvent<Params>) {
  await requireExecution(locals.authz, params.eid, 'execution.run');
  const parsed = markScenarioInput.safeParse({
    executionId: params.eid,
    ...stringFields(await request.formData()),
  });
  if (!parsed.success) return fail(400, { error: 'invalid-input' });

  try {
    const scenario = await markScenario(parsed.data);
    return { scenario };
  } catch (e) {
    return failureFor(e);
  }
}
