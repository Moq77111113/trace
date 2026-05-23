import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import type { Action } from '$lib/server/authz/actions';
import type { Authorizer } from '$lib/server/authz/authorizer';

/** Resolves a project by slug and authorizes `action` on it; throws 404 if absent, 403 if not allowed. */
export async function requireProject(authz: Authorizer, slug: string, action: Action) {
  const project = await db.query.projects.findFirst({ where: eq(projects.slug, slug) });
  if (!project) throw error(404, 'Project not found');
  await authz.authorize(action, [{ kind: 'project', id: project.id }, { kind: 'instance' }]);
  return project;
}

/** Resolves a project by id and authorizes `action` on it; throws 404 if absent, 403 if not allowed. */
export async function requireProjectById(authz: Authorizer, id: string, action: Action) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) throw error(404, 'Project not found');
  await authz.authorize(action, [{ kind: 'project', id: project.id }, { kind: 'instance' }]);
  return project;
}

/** The set of non-archived project ids the caller may `project.access`. Backs every project-level list filter. */
export async function accessibleProjectIds(authz: Authorizer): Promise<Set<string>> {
  const rows = await db.select({ id: projects.id }).from(projects).where(eq(projects.archived, false));
  const ids = new Set<string>();
  for (const p of rows) {
    if (await authz.can('project.access', [{ kind: 'project', id: p.id }, { kind: 'instance' }])) ids.add(p.id);
  }
  return ids;
}
