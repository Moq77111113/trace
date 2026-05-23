import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import type { Action } from './actions';
import { can, type PolicyRow, type ScopeRef, type SubjectRef } from './evaluate';
import { fetchPoliciesForUser } from './policy-store';

type GuardUser = App.Locals['user'];

/** Resolving authorizer: each method resolves a resource and authorizes `action` on it, returning the row or throwing. */
export type Guard = {
  /** Resolves a project by slug; throws 404 if absent, 403 if `action` is not allowed on it. */
  project(action: Action, slug: string): Promise<typeof projects.$inferSelect>;
};

/**
 * Builds a request-scoped guard for `user`. The user's policy set is fetched once
 * and reused across calls. An anonymous (`null`) user is denied everything.
 */
export function makeGuard(user: GuardUser): Guard {
  const subjects: SubjectRef[] = user ? [{ kind: 'user', id: user.id }, { kind: 'any-user' }] : [];
  let cache: PolicyRow[] | null = null;
  const policies = async (): Promise<PolicyRow[]> => (cache ??= await fetchPoliciesForUser(user?.id ?? null));

  const authorize = async (action: Action, chain: ScopeRef[]): Promise<void> => {
    if (!can({ subjects, action, scopeChain: chain, policies: await policies() })) throw error(403, 'forbidden');
  };

  return {
    async project(action, slug) {
      const project = await db.query.projects.findFirst({ where: eq(projects.slug, slug) });
      if (!project) throw error(404, 'Project not found');
      await authorize(action, [{ kind: 'project', id: project.id }, { kind: 'instance' }]);
      return project;
    },
  };
}
