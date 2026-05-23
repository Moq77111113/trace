import { redirect }  from '@sveltejs/kit';
import { listAccessibleProjects } from '$lib/server/projects/queries';
import type { Crumb } from '$lib/shared/lib/breadcrumbs';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
  if (!locals.session || !locals.user) {
    throw redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return {
    user:        locals.user,
    projects:    await listAccessibleProjects(locals.authz),
    theme:       locals.theme,
    accent:      locals.accent,
    breadcrumbs: [] as Crumb[],
  };
}) satisfies LayoutServerLoad;
