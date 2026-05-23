import { error } from '@sveltejs/kit';
import type { Authorizer } from '$lib/server/authz/authorizer';

/** Authorizes `instance.administer` and returns the proven-authorized acting user. Drop-in for the legacy `requireAdmin(locals.user)`. */
export async function requireInstanceAdmin(authz: Authorizer) {
  await authz.authorize('instance.administer', [{ kind: 'instance' }]);
  if (!authz.user) throw error(403, 'forbidden');
  return authz.user;
}
