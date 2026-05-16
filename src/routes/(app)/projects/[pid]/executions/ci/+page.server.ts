import { listApiKeys } from '$lib/server/api-keys';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { breadcrumbs } = await parent();
  const keys            = await listApiKeys(params.pid);
  const now             = Date.now();
  const hasUsableKey    = keys.some((k) => k.enabled && (!k.expiresAt || k.expiresAt.getTime() > now));

  return {
    hasUsableKey,
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_executions(), href: `/projects/${params.pid}/executions` },
      { label: 'CI' },
    ),
  };
};
