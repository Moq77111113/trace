import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects } from '$lib/server/db/schema';
import { parseFeatureCode } from '$lib/shared/lib/slug';
import type { Action } from '$lib/server/authz/actions';
import type { Authorizer } from '$lib/server/authz/authorizer';

const featureChain = (featureId: string, projectId: string) =>
  [{ kind: 'feature' as const, id: featureId }, { kind: 'project' as const, id: projectId }, { kind: 'instance' as const }];

/** Resolves a feature by project slug + code (e.g. `TRC-7`) and authorizes `action`; throws 404 if absent, 403 if not allowed. */
export async function requireFeature(authz: Authorizer, slug: string, code: string, action: Action) {
  const parsed = parseFeatureCode(code);
  if (!parsed) throw error(404, 'Feature not found');
  const [hit] = await db
    .select({ feature: features })
    .from(features)
    .innerJoin(projects, eq(projects.id, features.projectId))
    .where(and(eq(projects.slug, slug), eq(projects.codePrefix, parsed.prefix), eq(features.codeSeq, parsed.seq)));
  if (!hit) throw error(404, 'Feature not found');
  await authz.authorize(action, featureChain(hit.feature.id, hit.feature.projectId));
  return hit.feature;
}

/** Resolves a feature by id and authorizes `action`; throws 404 if absent, 403 if not allowed. */
export async function requireFeatureById(authz: Authorizer, id: string, action: Action) {
  const [feature] = await db.select().from(features).where(eq(features.id, id));
  if (!feature) throw error(404, 'Feature not found');
  await authz.authorize(action, featureChain(feature.id, feature.projectId));
  return feature;
}

/** The set of feature ids in `projectId` on which the caller may perform `action`. Backs intra-project list filters. */
export async function visibleFeatureIds(authz: Authorizer, projectId: string, action: Action): Promise<Set<string>> {
  const rows = await db.select({ id: features.id }).from(features).where(eq(features.projectId, projectId));
  const ids = new Set<string>();
  for (const f of rows) {
    if (await authz.can(action, featureChain(f.id, projectId))) ids.add(f.id);
  }
  return ids;
}
