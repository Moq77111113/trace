import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params }) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, params.pid),
  });
  if (!project) throw error(404, 'Project not found');

  return { project };
}) satisfies LayoutServerLoad;
