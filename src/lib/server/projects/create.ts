import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import { inferCodePrefix, isValidCodePrefix, isValidSlug, kebab } from '$lib/shared/lib/slug';
import { nextAvailableSlug } from './slug';

const slugField   = z.string().trim().refine(isValidSlug,        { error: 'invalid-slug' });
const prefixField = z.string().trim().refine(isValidCodePrefix,  { error: 'invalid-code-prefix' });

export const projectInput = z.object({
  name:        z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
  slug:        slugField.optional(),
  codePrefix:  prefixField.optional(),
});
export type ProjectInput = z.infer<typeof projectInput>;

export type Project = typeof projects.$inferSelect;
export type CreateProjectResult = Project | { error: 'slug-taken' };

export async function createProject(input: ProjectInput): Promise<CreateProjectResult> {
  let slug: string;
  if (input.slug) {
    const taken = await db.query.projects.findFirst({ where: eq(projects.slug, input.slug) });
    if (taken) return { error: 'slug-taken' };
    slug = input.slug;
  } else {
    slug = await nextAvailableSlug(kebab(input.name));
  }

  const codePrefix = input.codePrefix ?? inferCodePrefix(slug);

  const [row] = await db.insert(projects)
    .values({ name: input.name, description: input.description, slug, codePrefix })
    .returning();
  if (!row) throw new Error('createProject: insert returned no row');
  return row;
}
