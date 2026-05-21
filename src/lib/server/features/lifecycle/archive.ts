import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';

export type ArchiveError  = 'not-found';
export type ArchiveResult = Result<null, ArchiveError>;

/**
 * Soft-deletes a feature by setting `archived = true`. Run history (which references
 * features.id via FK with onDelete: 'restrict') is preserved untouched.
 */
export async function archiveFeature(featureId: string): Promise<ArchiveResult> {
  const rows = await db.update(features)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(features.id, featureId))
    .returning({ id: features.id });

  if (rows.length === 0) return err('not-found');
  return ok(null);
}
