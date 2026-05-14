import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';

export const projectInput = z.object({
  name:        z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
});
export type ProjectInput = z.infer<typeof projectInput>;

export async function createProject(input: ProjectInput) {
  const [row] = await db.insert(projects).values(input).returning();
  if (!row) throw new Error('createProject: insert returned no row');
  return row;
}
