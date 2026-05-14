import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { featureTemplate } from '$lib/gherkin/snippets';
import { z } from 'zod';

export const featureCreateInput = z.object({
  projectId: z.uuid({version: 'v7'}),
  name:      z.string().trim().min(1).max(200),
});
export type FeatureCreateInput = z.infer<typeof featureCreateInput>;

export async function createFeature(input: FeatureCreateInput) {
  const [row] = await db.insert(features)
    .values({ projectId: input.projectId, name: input.name, content: featureTemplate(input.name) })
    .returning();
  if (!row) throw new Error('createFeature: insert returned no row');
  return row;
}
