import { error, fail, redirect } from '@sveltejs/kit';
import { stringFields } from '$lib/server/forms';
import { createProject, projectInput } from '$lib/server/projects/create';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
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
  default: async ({ request, locals }) => {
    if (!locals.user) throw error(401, 'unauthorized');

    const data   = stringFields(await request.formData());
    const parsed = projectInput.safeParse(data);
    if (!parsed.success) {
      return fail(400, { error: m.new_project_error_invalid(), values: data, field: null });
    }

    const result = await createProject(parsed.data, locals.user.id);
    if (!result.ok) {
      return fail(409, { error: m.new_project_error_slug_taken(), values: data, field: 'slug' as const });
    }

    throw redirect(303, `/p/${result.value.slug}`);
  },
};
