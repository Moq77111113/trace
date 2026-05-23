import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import { inferCodePrefix, isValidCodePrefix, isValidSlug, kebab } from '$lib/shared/lib/slug';
import { ok, err, type Result } from '$lib/shared/lib/result';
import { grantCreator } from '$lib/server/authz/seed';
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
export type CreateProjectError  = 'slug-taken';
export type CreateProjectResult = Result<Project, CreateProjectError>;

export async function createProject(input: ProjectInput, creatorId: string): Promise<CreateProjectResult> {
  let slug: string;
  if (input.slug) {
    const taken = await db.query.projects.findFirst({ where: eq(projects.slug, input.slug) });
    if (taken) return err('slug-taken');
    slug = input.slug;
  } else {
    slug = await nextAvailableSlug(kebab(input.name));
  }

  const codePrefix = input.codePrefix ?? inferCodePrefix(slug);

  return db.transaction(async (tx) => {
    const [row] = await tx.insert(projects)
      .values({ name: input.name, description: input.description, slug, codePrefix, createdBy: creatorId })
      .returning();
    if (!row) throw new Error('createProject: insert returned no row');
    await grantCreator(tx, creatorId, row.id);
    return ok(row);
  });
}
