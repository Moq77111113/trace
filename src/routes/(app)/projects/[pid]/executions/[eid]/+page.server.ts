import { error, fail, redirect } from '@sveltejs/kit';
import { loadExecutionPage } from '$lib/server/executions/queries';
import { finishExecution } from '$lib/server/executions/finish';
import { rerunFailed } from '$lib/server/executions/rerun-failed';
import { resolveLiveExecutor } from '$lib/server/executions/auth';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const data = await loadExecutionPage(params.eid);
  if (!data)                          throw error(404, 'run not found');
  if (data.project.id !== params.pid) throw error(404, 'run not in this project');

  const { breadcrumbs } = await parent();
  return {
    ...data,
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_executions(), href: `/projects/${params.pid}/executions` },
      { label: params.eid.slice(0, 8) },
    ),
  };
}) satisfies PageServerLoad;

export const actions = {
  finish: async ({ params }) => {
    const finished = await finishExecution(params.eid);
    if (finished.status === 'IN_PROGRESS') return fail(500, { message: 'finish did not transition the run' });
    throw redirect(303, `/projects/${params.pid}/executions/${params.eid}`);
  },

  rerunFailed: async (event) => {
    const executedBy = resolveLiveExecutor(event);
    const result     = await rerunFailed({ parentExecutionId: event.params.eid, executedBy });
    if (!result.ok) return fail(409, { error: result.reason });
    throw redirect(303, `/projects/${event.params.pid}/executions/${result.execution.id}`);
  },
} satisfies Actions;
