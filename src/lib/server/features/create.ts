import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { features, featureGroups } from '$lib/server/db/schema';
import { featureTemplate } from '$lib/shared/gherkin/snippets';

export const featureCreateInput = z.object({
  projectId: z.uuid({version: 'v7'}),
  name:      z.string().trim().min(1).max(200),
  groupId:   z.uuid({version: 'v7'}).nullable().optional(),
});
export type FeatureCreateInput = z.infer<typeof featureCreateInput>;

export async function createFeature(input: FeatureCreateInput) {
  if (input.groupId) {
    const g = await db.query.featureGroups.findFirst({ where: eq(featureGroups.id, input.groupId) });
    if (!g || g.projectId !== input.projectId) throw new Error('createFeature: invalid-group');
  }
  const [row] = await db.insert(features)
    .values({
      projectId: input.projectId,
      name:      input.name,
      content:   featureTemplate(input.name),
      groupId:   input.groupId ?? null,
    })
    .returning();
  if (!row) throw new Error('createFeature: insert returned no row');
  return row;
}
