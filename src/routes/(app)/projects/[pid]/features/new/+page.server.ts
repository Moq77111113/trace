import { fail, redirect } from '@sveltejs/kit';
import { createFeature, featureCreateInput } from '$lib/server/features/create';
import { listGroups } from '$lib/server/groups/queries';
import { stringFields } from '$lib/server/forms';
import { appendCrumb } from '$lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { breadcrumbs } = await parent();
  return {
    groups:      await listGroups(params.pid),
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.breadcrumb_new_feature() }),
  };
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    const data    = stringFields(await request.formData());
    const groupId = data.groupId === '' || data.groupId === undefined ? null : data.groupId;
    const parsed  = featureCreateInput.safeParse({ projectId: params.pid, ...data, groupId });
    if (!parsed.success) return fail(400, { error: parsed.error.message, values: data });

    const f = await createFeature(parsed.data);
    throw redirect(303, `/projects/${params.pid}/features/${f.id}`);
  },
};
