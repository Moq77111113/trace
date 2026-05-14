import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export async function listFeatures(projectId: string) {
  return db.query.features.findMany({
    where:   and(eq(features.projectId, projectId), eq(features.archived, false)),
    orderBy: (f, { desc }) => [desc(f.updatedAt)],
  });
}

export async function getFeature(featureId: string) {
  return db.query.features.findFirst({ where: eq(features.id, featureId) });
}
