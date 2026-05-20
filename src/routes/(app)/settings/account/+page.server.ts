import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { PASSWORD_MIN_LENGTH } from '$lib/server/auth/constants';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

type AccountListItem = { providerId: string };

async function listProviders(headers: Headers): Promise<string[]> {
  const accounts = (await auth.api.listUserAccounts({ headers })) as AccountListItem[];
  return accounts.map((a) => a.providerId);
}

export const load: PageServerLoad = async ({ parent, request, locals }) => {
  if (!locals.session) throw redirect(303, '/login');
  const { breadcrumbs } = await parent();
  const providers = await listProviders(request.headers);
  const oidcProvider = !providers.includes('credential') && providers.length > 0 ? (providers[0] ?? null) : null;
  return {
    breadcrumbs:       appendCrumb(breadcrumbs, { label: m.nav_account() }),
    oidcProvider,
    passwordMinLength: PASSWORD_MIN_LENGTH,
  };
};
