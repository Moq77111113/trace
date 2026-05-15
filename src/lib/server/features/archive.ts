import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';

export type ArchiveResult = { ok: true } | { ok: false; reason: 'not-found' };

/**
 * Soft-deletes a feature by setting `archived = true`. Run history (which references
 * features.id via FK with onDelete: 'restrict') is preserved untouched.
 */
export async function archiveFeature(featureId: string): Promise<ArchiveResult> {
  const rows = await db.update(features)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(features.id, featureId))
    .returning({ id: features.id });

  if (rows.length === 0) return { ok: false, reason: 'not-found' };
  return { ok: true };
}
