import { error, fail, redirect } from '@sveltejs/kit';
import { loadRunPage } from '$lib/server/runs/queries';
import { finishRun } from '$lib/server/runs/finish';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const data = await loadRunPage(params.rid);
  if (!data)                          throw error(404, 'run not found');
  if (data.project.id !== params.pid) throw error(404, 'run not in this project');
  return data;
}) satisfies PageServerLoad;

export const actions = {
  finish: async ({ params }) => {
    const finished = await finishRun(params.rid);
    if (finished.status === 'RUNNING') return fail(500, { message: 'finish did not transition the run' });
    throw redirect(303, `/projects/${params.pid}/runs/${params.rid}`);
  },
} satisfies Actions;
