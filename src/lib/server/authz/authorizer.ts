import { error } from '@sveltejs/kit';
import type { Action } from './actions';
import { can, type PolicyRow, type ScopeRef, type SubjectRef } from './evaluate';
import { fetchPoliciesForUser } from './policy-store';

/** Request-scoped authorization decision-maker. Domain-agnostic: it knows only subjects, policies, an action and an opaque scope chain. */
export type Authorizer = {
  readonly user: App.Locals['user'];
  /** True if `user` may perform `action` on the resource described by `scopeChain`. */
  can(action: Action, scopeChain: ScopeRef[]): Promise<boolean>;
  /** Throws `error(403)` unless `can(action, scopeChain)`. */
  authorize(action: Action, scopeChain: ScopeRef[]): Promise<void>;
};

/** Builds a request-scoped authorizer; fetches the user's policies once (cached) and reuses them. An anonymous (`null`) user is denied everything. */
export function makeAuthorizer(user: App.Locals['user']): Authorizer {
  const subjects: SubjectRef[] = user ? [{ kind: 'user', id: user.id }, { kind: 'any-user' }] : [];
  let cache: PolicyRow[] | null = null;
  const policies = async (): Promise<PolicyRow[]> => (cache ??= await fetchPoliciesForUser(user?.id ?? null));

  const decide = async (action: Action, scopeChain: ScopeRef[]): Promise<boolean> =>
    can({ subjects, action, scopeChain, policies: await policies() });

  return {
    user,
    can: decide,
    async authorize(action, scopeChain) {
      if (!(await decide(action, scopeChain))) throw error(403, 'forbidden');
    },
  };
}
