import { redirect, type RequestEvent } from '@sveltejs/kit';
import { abortExecution } from '$lib/server/executions/run/abort';
import { failureFor } from './failure';

type Params = { slug: string; eid: string };

export async function abort({ params }: RequestEvent<Params>) {
  try {
    await abortExecution(params.eid);
  } catch (e) {
    return failureFor(e);
  }
  throw redirect(303, `/p/${params.slug}/executions/${params.eid}`);
}
