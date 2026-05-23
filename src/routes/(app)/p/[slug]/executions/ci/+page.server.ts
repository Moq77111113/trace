import { listApiKeys } from '$lib/server/api-keys';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import { requireProject } from '$lib/server/projects/authz';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params, locals }) => {
  await requireProject(locals.authz, params.slug, 'execution.review');
  const { project, breadcrumbs } = await parent();
  const keys                     = await listApiKeys(project.id);
  const now                      = Date.now();
  const hasUsableKey             = keys.some((k) => k.enabled && (!k.expiresAt || k.expiresAt.getTime() > now));

  return {
    hasUsableKey,
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_executions(), href: `/p/${project.slug}/executions` },
      { label: 'CI' },
    ),
  };
};
