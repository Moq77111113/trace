import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { listGroups } from '$lib/server/groups/queries';
import { createGroup, groupCreateInput } from '$lib/server/groups/create';
import { deleteGroup, groupDeleteInput } from '$lib/server/groups/delete';
import { renameGroup, groupRenameInput } from '$lib/server/groups/rename';
import { reorderGroups, groupReorderInput } from '$lib/server/groups/reorder';
import { getProjectDashboardStats } from '$lib/server/projects/queries';
import { stringFields } from '$lib/server/forms';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

type Params = { pid: string };

export const load = (async ({ params, parent }) => {
  const [stats, groups, parentData] = await Promise.all([
    getProjectDashboardStats(params.pid),
    listGroups(params.pid),
    parent(),
  ]);
  return {
    stats,
    groups,
    breadcrumbs: appendCrumb(parentData.breadcrumbs, { label: m.nav_overview() }),
  };
}) satisfies PageServerLoad;

export const actions = {
  createGroup: async ({ request, params }: RequestEvent<Params>) => {
    const data   = stringFields(await request.formData());
    const parsed = groupCreateInput.safeParse({ ...data, projectId: params.pid });
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'createGroup' });

    const result = await createGroup(parsed.data);
    if ('error' in result) return fail(400, { error: result.error, action: 'createGroup' });

    throw redirect(303, `/projects/${params.pid}`);
  },

  renameGroup: async ({ request, params }: RequestEvent<Params>) => {
    const data   = stringFields(await request.formData());
    const parsed = groupRenameInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'renameGroup' });

    const result = await renameGroup(parsed.data);
    if ('error' in result) return fail(result.error === 'not-found' ? 404 : 400, { error: result.error, action: 'renameGroup' });

    throw redirect(303, `/projects/${params.pid}`);
  },

  deleteGroup: async ({ request, params }: RequestEvent<Params>) => {
    const data   = stringFields(await request.formData());
    const parsed = groupDeleteInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'deleteGroup' });

    const result = await deleteGroup(parsed.data);
    if ('error' in result) return fail(404, { error: result.error, action: 'deleteGroup' });

    throw redirect(303, `/projects/${params.pid}`);
  },

  reorderGroups: async ({ request, params }: RequestEvent<Params>) => {
    const raw     = await request.formData();
    const ordered = raw.get('orderedIds');
    if (typeof ordered !== 'string') return fail(400, { error: 'invalid-input', action: 'reorderGroups' });

    let orderedIds: unknown;
    try { orderedIds = JSON.parse(ordered); } catch { return fail(400, { error: 'invalid-input', action: 'reorderGroups' }); }

    const parsed = groupReorderInput.safeParse({ projectId: params.pid, orderedIds });
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'reorderGroups' });

    const result = await reorderGroups(parsed.data);
    if ('error' in result) return fail(400, { error: result.error, action: 'reorderGroups' });

    throw redirect(303, `/projects/${params.pid}`);
  },
};
