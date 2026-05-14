import { fail, redirect } from '@sveltejs/kit';
import { createProject, projectInput } from '$lib/server/projects/create';
import type { Actions } from './$types';

function stringFields(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

export const actions: Actions = {
  default: async ({ request }) => {
    const data   = stringFields(await request.formData());
    const parsed = projectInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: parsed.error.message, values: data });

    const project = await createProject(parsed.data);
    throw redirect(303, `/projects/${project.id}`);
  },
};
