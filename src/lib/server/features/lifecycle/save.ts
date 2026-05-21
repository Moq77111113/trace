import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { features, featureGroups, manualScenarios } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import { syncFeatureTags } from '../internal/tags-sync';
import { proposeFeatureSave } from './save-proposal';

type Feature = typeof features.$inferSelect;

/**
 * Form-level input contract for the save action: matches the FormData fields
 * the editor posts. `featureId` and `editor` are resolved server-side and
 * combined with this payload before calling `saveFeature`.
 */
export const featureSaveBody = z.object({
  content:     z.string().max(200_000),
  description: z.string().max(50_000).optional().default(''),
  version:     z.coerce.number().int().nonnegative(),
  groupId:     z.uuid({ version: 'v7' }).nullable().optional(),
});
export type FeatureSaveBody = z.infer<typeof featureSaveBody>;

type SaveInput = {
  featureId:       string;
  content:         string;
  description:     string | null;
  expectedVersion: number;
  editor:          string;
  groupId?:        string | null;
};

export type SaveResult =
  | { ok: true;  feature: Feature }
  | { ok: false; reason: 'version-conflict';        currentFeature: Feature }
  | { ok: false; reason: 'manual-name-collision';   collisions: string[] };

/**
 * Persists feature content under an optimistic version lock.
 * Rules (refuse vs apply) live in `proposeFeatureSave`; this wrapper owns I/O:
 * loads `current`, fetches live manual names for collision checks, validates the
 * target group exists when an `apply` proposal references one, writes the update
 * and reconciles tags. The `editor` field is reserved for the M6 audit log.
 */
export async function saveFeature(input: SaveInput): Promise<SaveResult> {
  return db.transaction(async (tx) => {
    const current = await tx.query.features.findFirst({ where: eq(features.id, input.featureId) });
    if (!current) throw new Error('saveFeature: feature not found');

    const parsed = parse(input.content);

    const liveManualNames = parsed.scenarios.length > 0
      ? (await tx
          .select({ name: manualScenarios.name })
          .from(manualScenarios)
          .where(and(eq(manualScenarios.featureId, input.featureId), eq(manualScenarios.archived, false)))
        ).map((m) => m.name)
      : [];

    const proposal = proposeFeatureSave({
      current,
      expectedVersion: input.expectedVersion,
      content:         input.content,
      description:     input.description,
      groupId:         input.groupId,
      parsed,
      liveManualNames,
    });

    if (proposal.kind === 'version-conflict') {
      return { ok: false, reason: 'version-conflict', currentFeature: proposal.currentFeature };
    }
    if (proposal.kind === 'manual-name-collision') {
      return { ok: false, reason: 'manual-name-collision', collisions: proposal.collisions };
    }

    if (input.groupId) {
      const g = await tx.query.featureGroups.findFirst({ where: eq(featureGroups.id, input.groupId) });
      if (!g || g.projectId !== current.projectId) throw new Error('saveFeature: invalid-group');
    }

    const [updated] = await tx.update(features)
      .set({ ...proposal.updates, updatedAt: new Date() })
      .where(eq(features.id, input.featureId))
      .returning();
    if (!updated) throw new Error('saveFeature: update returned no row');

    await syncFeatureTags(tx, { projectId: current.projectId, featureId: input.featureId, parsedTags: parsed.tags });

    return { ok: true, feature: updated };
  });
}
