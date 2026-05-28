import { error } from '@sveltejs/kit';
import { loadExecutionPage } from '$lib/server/executions/read/queries';
import { requireExecution } from '$lib/server/executions/authz';
import { requireProject } from '$lib/server/projects/authz';
import { parseRunScope } from '$lib/features/print-report/lib/scope';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, url, locals }) => {
  const project = await requireProject(locals.authz, params.slug, 'execution.review');
  await requireExecution(locals.authz, params.eid, 'execution.review');

  const data = await loadExecutionPage(params.eid);
  if (!data)                          throw error(404, 'Run not found');
  if (data.project.id !== project.id) throw error(404, 'Run not in this project');

  return {
    ...data,
    scope: parseRunScope(url.searchParams.get('scope')),
  };
}) satisfies PageServerLoad;
