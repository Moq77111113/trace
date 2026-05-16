import { appendCrumb } from '$lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { breadcrumbs } = await parent();
  return {
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_executions(), href: `/projects/${params.pid}/executions` },
      { label: 'CI' },
    ),
  };
};
