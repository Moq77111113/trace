import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import { requireProject } from '$lib/server/projects/authz';
import { preview } from './actions/preview';
import { commit }  from './actions/commit';
import { manualPreview } from './actions/manual-preview';
import { manualCommit }  from './actions/manual-commit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  await requireProject(locals.authz, params.slug, 'feature.author');
  const { breadcrumbs } = await parent();
  return {
    breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_import() }),
  };
};

export const actions = {
  preview,
  commit,
  manualPreview,
  manualCommit,
} satisfies Actions;
