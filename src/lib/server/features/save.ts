import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { parse } from '$lib/gherkin/parse';
import { syncFeatureTags } from './tags-sync';

type Feature = typeof features.$inferSelect;

type SaveInput = {
  featureId:       string;
  content:         string;
  expectedVersion: number;
  editor:          string;
};

export type SaveResult =
  | { conflict: false; feature:        Feature }
  | { conflict: true;  currentFeature: Feature };

/**
 * Persists feature content under an optimistic version lock.
 * On version match: parses the Gherkin (errors are stored, never thrown),
 * refreshes the feature name when the source declares one, bumps the
 * version, and reconciles tag links. On mismatch: returns the current row
 * untouched so the caller can present a conflict UI.
 *
 * The `editor` field is reserved for the M6 audit log; it is accepted
 * here for forward compatibility but is not persisted on `features`.
 */
export async function saveFeature(input: SaveInput): Promise<SaveResult> {
  return db.transaction(async (tx) => {
    const current = await tx.query.features.findFirst({ where: eq(features.id, input.featureId) });
    if (!current) throw new Error('saveFeature: feature not found');

    if (current.version !== input.expectedVersion) {
      return { conflict: true, currentFeature: current };
    }

    const parsed  = parse(input.content);
    const errors  = parsed.errors.length > 0 ? parsed.errors : null;
    const trimmed = parsed.name?.trim();
    const newName = trimmed ? trimmed : current.name;

    const [updated] = await tx.update(features)
      .set({
        content:     input.content,
        name:        newName,
        parseErrors: errors,
        version:     current.version + 1,
        updatedAt:   new Date(),
      })
      .where(eq(features.id, input.featureId))
      .returning();

    if (!updated) throw new Error('saveFeature: update returned no row');

    await syncFeatureTags(tx, { projectId: current.projectId, featureId: input.featureId, parsedTags: parsed.tags });

    return { conflict: false, feature: updated };
  });
}
