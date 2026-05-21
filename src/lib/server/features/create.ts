import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { features, featureGroups } from '$lib/server/db/schema';
import { allocateCodeSeq } from './code-seq';

export const featureCreateInput = z.object({
  projectId: z.uuid({version: 'v7'}),
  name:      z.string().trim().min(1).max(200),
  groupId:   z.uuid({version: 'v7'}).nullable().optional(),
});
export type FeatureCreateInput = z.infer<typeof featureCreateInput>;

export async function createFeature(input: FeatureCreateInput) {
  return db.transaction(async (tx) => {
    if (input.groupId) {
      const g = await tx.query.featureGroups.findFirst({ where: eq(featureGroups.id, input.groupId) });
      if (!g || g.projectId !== input.projectId) throw new Error('createFeature: invalid-group');
    }

    const codeSeq = await allocateCodeSeq(tx, input.projectId);

    const [row] = await tx.insert(features)
      .values({
        projectId:   input.projectId,
        name:        input.name,
        content:     null,
        description: null,
        groupId:     input.groupId ?? null,
        codeSeq,
      })
      .returning();
    if (!row) throw new Error('createFeature: insert returned no row');
    return row;
  });
}
