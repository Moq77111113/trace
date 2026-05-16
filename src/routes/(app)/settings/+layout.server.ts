import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
  const { breadcrumbs } = await parent();
  return {
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_settings(), href: '/settings/account' }),
  };
};
