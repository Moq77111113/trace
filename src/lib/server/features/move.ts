import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { features, featureGroups } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';

export const featureMoveInput = z.object({
  featureId: z.uuid({ version: 'v7' }),
  groupId:   z.uuid({ version: 'v7' }).nullable(),
});
export type FeatureMoveInput = z.infer<typeof featureMoveInput>;

export type MoveFeatureError  = 'feature-not-found' | 'group-not-found' | 'cross-project';
export type MoveFeatureResult = Result<null, MoveFeatureError>;

export async function moveFeature(input: FeatureMoveInput): Promise<MoveFeatureResult> {
  const [feature] = await db
    .select({ id: features.id, projectId: features.projectId })
    .from(features)
    .where(eq(features.id, input.featureId));
  if (!feature) return err('feature-not-found');

  if (input.groupId !== null) {
    const [group] = await db
      .select({ id: featureGroups.id })
      .from(featureGroups)
      .where(and(eq(featureGroups.id, input.groupId), eq(featureGroups.projectId, feature.projectId)));
    if (!group) return err('group-not-found');
  }

  await db.update(features)
    .set({ groupId: input.groupId, updatedAt: new Date() })
    .where(eq(features.id, input.featureId));

  return ok(null);
}
