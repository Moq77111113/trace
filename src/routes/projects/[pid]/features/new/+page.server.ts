import { fail, redirect } from '@sveltejs/kit';
import { createFeature, featureCreateInput } from '$lib/server/features/create';
import { stringFields } from '$lib/server/forms';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, params }) => {
    const data   = stringFields(await request.formData());
    const parsed = featureCreateInput.safeParse({ projectId: params.pid, ...data });
    if (!parsed.success) return fail(400, { error: parsed.error.message, values: data });

    const f = await createFeature(parsed.data);
    throw redirect(303, `/projects/${params.pid}/features/${f.id}`);
  },
};
