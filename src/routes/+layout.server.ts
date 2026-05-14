import { db }       from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import { eq }       from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load = (async () => {
  const all = await db.query.projects.findMany({
    where:   eq(projects.archived, false),
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  return { projects: all };
}) satisfies LayoutServerLoad;
