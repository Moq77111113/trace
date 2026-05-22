import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import { preview } from './actions/preview';
import { commit }  from './actions/commit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { breadcrumbs } = await parent();
  return {
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_import() }),
  };
};

export const actions = {
  preview,
  commit,
} satisfies Actions;
