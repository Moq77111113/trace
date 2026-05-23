import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { projects, features, executions } from '$lib/server/db/schema';
import { parseFeatureCode } from '$lib/shared/lib/slug';
import type { Action } from './actions';
import { can, type PolicyRow, type ScopeRef, type SubjectRef } from './evaluate';
import { fetchPoliciesForUser } from './policy-store';

type GuardUser = App.Locals['user'];

/** Resolving authorizer: each method resolves a resource and authorizes `action` on it, returning the row or throwing. */
export type Guard = {
  /** Resolves a project by slug; throws 404 if absent, 403 if `action` is not allowed on it. */
  project(action: Action, slug: string): Promise<typeof projects.$inferSelect>;
  /** Resolves a feature by project slug + code (e.g. `TRC-7`); throws 404 if absent, 403 if `action` is not allowed. */
  feature(action: Action, slug: string, code: string): Promise<typeof features.$inferSelect>;
  /** Resolves an execution by id; throws 404 if absent, 403 if `action` is not allowed on its project. */
  execution(action: Action, id: string): Promise<typeof executions.$inferSelect>;
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

    async feature(action, slug, code) {
      const parsed = parseFeatureCode(code);
      if (!parsed) throw error(404, 'Feature not found');

      const [hit] = await db
        .select({ feature: features })
        .from(features)
        .innerJoin(projects, eq(projects.id, features.projectId))
        .where(and(
          eq(projects.slug, slug),
          eq(projects.codePrefix, parsed.prefix),
          eq(features.codeSeq, parsed.seq),
        ));
      if (!hit) throw error(404, 'Feature not found');

      const feature = hit.feature;
      await authorize(action, [
        { kind: 'feature', id: feature.id },
        { kind: 'project', id: feature.projectId },
        { kind: 'instance' },
      ]);
      return feature;
    },

    async execution(action, id) {
      const [hit] = await db
        .select({ execution: executions, projectId: features.projectId })
        .from(executions)
        .innerJoin(features, eq(features.id, executions.featureId))
        .where(eq(executions.id, id));
      if (!hit) throw error(404, 'Execution not found');

      const execution = hit.execution;
      await authorize(action, [
        { kind: 'execution', id: execution.id },
        { kind: 'feature', id: execution.featureId },
        { kind: 'project', id: hit.projectId },
        { kind: 'instance' },
      ]);
      return execution;
    },
  };
}
