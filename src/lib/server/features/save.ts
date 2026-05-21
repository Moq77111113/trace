import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, featureGroups } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import { syncFeatureTags } from './tags-sync';

type Feature = typeof features.$inferSelect;

type SaveInput = {
  featureId:       string;
  content:         string;
  description:     string | null;
  expectedVersion: number;
  editor:          string;
  groupId?:        string | null;
};

export type SaveResult =
  | { conflict: false; feature:        Feature }
  | { conflict: true;  currentFeature: Feature };

/**
 * Persists feature content under an optimistic version lock.
 * On version match: parses Gherkin, refreshes name, bumps version, reconciles tags,
 * and updates groupId if provided (cross-project assignment is rejected before write).
 * On mismatch: returns the current row untouched for the caller to present conflict UI.
 * The `editor` field is reserved for the M6 audit log; not persisted on features.
 * `groupId === undefined` preserves the current value (form did not send it).
 * Explicit `null` means "ungrouped".
 */
export async function saveFeature(input: SaveInput): Promise<SaveResult> {
  return db.transaction(async (tx) => {
    const current = await tx.query.features.findFirst({ where: eq(features.id, input.featureId) });
    if (!current) throw new Error('saveFeature: feature not found');

    if (current.version !== input.expectedVersion) {
      return { conflict: true, currentFeature: current };
    }

    if (input.groupId) {
      const g = await tx.query.featureGroups.findFirst({ where: eq(featureGroups.id, input.groupId) });
      if (!g || g.projectId !== current.projectId) throw new Error('saveFeature: invalid-group');
    }

    const parsed  = parse(input.content);
    const errors  = parsed.errors.length > 0 ? parsed.errors : null;
    const trimmed = parsed.name?.trim();
    const newName = trimmed ? trimmed : current.name;

    const [updated] = await tx.update(features)
      .set({
        content:     input.content,
        description: input.description,
        name:        newName,
        parseErrors: errors,
        version:     current.version + 1,
        groupId:     input.groupId === undefined ? current.groupId : input.groupId,
        updatedAt:   new Date(),
      })
      .where(eq(features.id, input.featureId))
      .returning();

    if (!updated) throw new Error('saveFeature: update returned no row');

    await syncFeatureTags(tx, { projectId: current.projectId, featureId: input.featureId, parsedTags: parsed.tags });

    return { conflict: false, feature: updated };
  });
}
