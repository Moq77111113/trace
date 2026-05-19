import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { listGroups } from '$lib/server/groups/queries';
import { createGroup, groupCreateInput } from '$lib/server/groups/create';
import { deleteGroup, groupDeleteInput } from '$lib/server/groups/delete';
import { renameGroup, groupRenameInput } from '$lib/server/groups/rename';
import { reorderGroups, groupReorderInput } from '$lib/server/groups/reorder';
import { getProjectDashboardStats, getProjectIdBySlug } from '$lib/server/projects/queries';
import { stringFields } from '$lib/server/forms';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

type Params = { slug: string };

export const load = (async ({ parent }) => {
  const { project, breadcrumbs } = await parent();
  const [stats, groups] = await Promise.all([
    getProjectDashboardStats(project.id),
    listGroups(project.id),
  ]);
  return {
    stats,
    groups,
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_overview() }),
  };
}) satisfies PageServerLoad;

async function requireProjectId(slug: string): Promise<string> {
  const id = await getProjectIdBySlug(slug);
  if (!id) throw error(404, 'Project not found');
  return id;
}

export const actions = {
  createGroup: async ({ request, params }: RequestEvent<Params>) => {
    const projectId = await requireProjectId(params.slug);
    const data      = stringFields(await request.formData());
    const parsed    = groupCreateInput.safeParse({ ...data, projectId });
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'createGroup' });

    const result = await createGroup(parsed.data);
    if (!result.ok) return fail(400, { error: result.error, action: 'createGroup' });

    throw redirect(303, `/p/${params.slug}`);
  },

  renameGroup: async ({ request, params }: RequestEvent<Params>) => {
    const data   = stringFields(await request.formData());
    const parsed = groupRenameInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'renameGroup' });

    const result = await renameGroup(parsed.data);
    if (!result.ok) return fail(result.error === 'not-found' ? 404 : 400, { error: result.error, action: 'renameGroup' });

    throw redirect(303, `/p/${params.slug}`);
  },

  deleteGroup: async ({ request, params }: RequestEvent<Params>) => {
    const data   = stringFields(await request.formData());
    const parsed = groupDeleteInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'deleteGroup' });

    const result = await deleteGroup(parsed.data);
    if (!result.ok) return fail(404, { error: result.error, action: 'deleteGroup' });

    throw redirect(303, `/p/${params.slug}`);
  },

  reorderGroups: async ({ request, params }: RequestEvent<Params>) => {
    const projectId = await requireProjectId(params.slug);
    const raw       = await request.formData();
    const ordered   = raw.get('orderedIds');
    if (typeof ordered !== 'string') return fail(400, { error: 'invalid-input', action: 'reorderGroups' });

    let orderedIds: unknown;
    try { orderedIds = JSON.parse(ordered); } catch { return fail(400, { error: 'invalid-input', action: 'reorderGroups' }); }

    const parsed = groupReorderInput.safeParse({ projectId, orderedIds });
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'reorderGroups' });

    const result = await reorderGroups(parsed.data);
    if (!result.ok) return fail(400, { error: result.error, action: 'reorderGroups' });

    throw redirect(303, `/p/${params.slug}`);
  },
};
