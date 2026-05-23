import { redirect, type RequestEvent } from '@sveltejs/kit';
import { abortExecution } from '$lib/server/executions/run/abort';
import { requireExecution } from '$lib/server/executions/authz';
import { failureFor } from './failure';

type Params = { slug: string; eid: string };

export async function abort({ params, locals }: RequestEvent<Params>) {
  await requireExecution(locals.authz, params.eid, 'execution.run');
  try {
    await abortExecution(params.eid);
  } catch (e) {
    return failureFor(e);
  }
  throw redirect(303, `/p/${params.slug}/executions/${params.eid}`);
}
