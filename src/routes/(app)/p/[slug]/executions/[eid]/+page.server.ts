import { error, fail, redirect } from '@sveltejs/kit';
import { loadExecutionPage } from '$lib/server/executions/read/queries';
import { finishExecution } from '$lib/server/executions/run/finish';
import { rerunFailed } from '$lib/server/executions/run/rerun-failed';
import { resolveLiveExecutor } from '$lib/server/executions/executor';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import { requireExecution } from '$lib/server/executions/authz';
import { setStatus } from './actions/set-status';
import { saveNotes } from './actions/save-notes';
import { abort } from './actions/abort';
import { uploadAttachmentAction } from './actions/upload-attachment';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, parent, locals }) => {
  const { project, breadcrumbs } = await parent();
  await requireExecution(locals.authz, params.eid, 'execution.review');

  const data = await loadExecutionPage(params.eid);
  if (!data)                          throw error(404, 'run not found');
  if (data.project.id !== project.id) throw error(404, 'run not in this project');

  return {
    ...data,
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_executions(), href: `/p/${project.slug}/executions` },
      { label: params.eid.slice(0, 8) },
    ),
  };
}) satisfies PageServerLoad;

export const actions = {
  finish: async ({ params, locals }) => {
    await requireExecution(locals.authz, params.eid, 'execution.run');
    const finished = await finishExecution(params.eid);
    if (finished.status === 'IN_PROGRESS') return fail(500, { error: 'finish did not transition the run' });
    throw redirect(303, `/p/${params.slug}/executions/${params.eid}`);
  },

  rerunFailed: async (event) => {
    await requireExecution(event.locals.authz, event.params.eid, 'execution.run');
    const executedBy = resolveLiveExecutor(event);
    const result     = await rerunFailed({ parentExecutionId: event.params.eid, executedBy });
    if (!result.ok) return fail(409, { error: result.error });
    throw redirect(303, `/p/${event.params.slug}/executions/${result.value.id}`);
  },

  setStatus,
  saveNotes,
  abort,
  uploadAttachment: uploadAttachmentAction,
} satisfies Actions;
