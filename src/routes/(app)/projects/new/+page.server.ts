import { fail, redirect } from '@sveltejs/kit';
import { stringFields } from '$lib/server/forms';
import { createProject, projectInput } from '$lib/server/projects/create';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data   = stringFields(await request.formData());
    const parsed = projectInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: parsed.error.message, values: data });

    const project = await createProject(parsed.data);
    throw redirect(303, `/projects/${project.id}`);
  },
};
