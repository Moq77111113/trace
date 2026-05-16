import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { breadcrumbs } = await parent();
  return {
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_account() }),
  };
};
