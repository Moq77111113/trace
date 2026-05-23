import { error, fail, redirect } from '@sveltejs/kit';
import { createFeature, featureCreateInput } from '$lib/server/features/lifecycle/create';
import { listGroups } from '$lib/server/groups/queries';
import { getProjectBySlug } from '$lib/server/projects/queries';
import { requireProject } from '$lib/server/projects/authz';
import { stringFields } from '$lib/server/forms';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import { formatFeatureCode } from '$lib/shared/lib/slug';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { project, breadcrumbs } = await parent();
  return {
    groups:      await listGroups(project.id),
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.breadcrumb_new_feature() }),
  };
};

export const actions: Actions = {
  default: async (event) => {
    await requireProject(event.locals.authz, event.params.slug, 'feature.author');
    const project = await getProjectBySlug(event.params.slug);
    if (!project) throw error(404, 'Project not found');
    const { request, params } = event;

    const data    = stringFields(await request.formData());
    const groupId = data.groupId === '' || data.groupId === undefined ? null : data.groupId;
    const parsed  = featureCreateInput.safeParse({ projectId: project.id, ...data, groupId });
    if (!parsed.success) return fail(400, { error: parsed.error.message, values: data });

    const f = await createFeature(parsed.data);
    throw redirect(303, `/p/${project.slug}/${formatFeatureCode(project.codePrefix, f.codeSeq)}`);
  },
};
