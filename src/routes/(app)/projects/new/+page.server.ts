import { fail, redirect } from '@sveltejs/kit';
import { stringFields } from '$lib/server/forms';
import { createProject, projectInput } from '$lib/server/projects/create';
import { appendCrumb } from '$lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { breadcrumbs } = await parent();
  return {
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_projects(), href: '/' },
      { label: m.breadcrumb_new_project() },
    ),
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data   = stringFields(await request.formData());
    const parsed = projectInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: parsed.error.message, values: data });

    const project = await createProject(parsed.data);
    throw redirect(303, `/projects/${project.id}`);
  },
};
