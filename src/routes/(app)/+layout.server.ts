import { redirect }  from '@sveltejs/kit';
import { db }        from '$lib/server/db/client';
import { projects }  from '$lib/server/db/schema';
import { eq }        from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
  if (!locals.session || !locals.user) {
    throw redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }

  const all = await db.query.projects.findMany({
    where:   eq(projects.archived, false),
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  return {
    user:     locals.user,
    projects: all,
    theme:    locals.theme,
    accent:   locals.accent,
  };
}) satisfies LayoutServerLoad;
