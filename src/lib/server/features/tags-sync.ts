import type { DbTx } from '$lib/server/db/client';
import { tags, featureTags } from '$lib/server/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

type SyncInput = {
  projectId:  string;
  featureId:  string;
  parsedTags: string[];
};

/**
 * Reconciles the tag links of a feature with the provided list inside the
 * caller's transaction: upserts missing tags (case-insensitive uniqueness
 * per project), adds/removes links to match `parsedTags`, and garbage-collects
 * project tags no longer referenced by any feature.
 *
 * Takes a `DbTx` rather than the top-level `db` so the feature update and the
 * tag reconciliation commit (or roll back) together — saving a feature without
 * its tag links, or vice-versa, would leave the project in a broken state.
 */
export async function syncFeatureTags(tx: DbTx, { projectId, featureId, parsedTags }: SyncInput): Promise<void> {
  const wanted = [...new Set(parsedTags.map((t) => t.trim()).filter(Boolean))];

  if (wanted.length > 0) {
    // Raw SQL: the unique index targets `(project_id, LOWER(name))`, an expression
    // index Drizzle's typed `.onConflictDoNothing({ target })` cannot express.
    // Column refs in INSERT col-list and ON CONFLICT target list must be
    // unqualified — `sql.identifier(col.name)` emits the bare quoted name.
    const projectIdCol = sql.identifier(tags.projectId.name);
    const nameCol      = sql.identifier(tags.name.name);
    const values       = sql.join(
      wanted.map((name) => sql`(${projectId}, ${name})`),
      sql.raw(', '),
    );
    await tx.execute(sql`
      INSERT INTO ${tags} (${projectIdCol}, ${nameCol})
      VALUES ${values}
      ON CONFLICT (${projectIdCol}, LOWER(${nameCol})) DO NOTHING
    `);
  }

  const wantedRows = wanted.length > 0
    ? await tx.query.tags.findMany({
        where: and(eq(tags.projectId, projectId), inArray(tags.name, wanted)),
      })
    : [];
  const wantedIds = new Set(wantedRows.map((r) => r.id));

  const currentLinks = await tx.query.featureTags.findMany({
    where: eq(featureTags.featureId, featureId),
  });
  const currentIds = new Set(currentLinks.map((l) => l.tagId));

  const toAdd    = [...wantedIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !wantedIds.has(id));

  if (toAdd.length > 0) {
    await tx.insert(featureTags).values(toAdd.map((tagId) => ({ featureId, tagId })));
  }

  if (toRemove.length > 0) {
    await tx.delete(featureTags)
      .where(and(eq(featureTags.featureId, featureId), inArray(featureTags.tagId, toRemove)));
  }

  // GC orphans within the project (anti-join via NOT EXISTS — not a correlated select)
  await tx.execute(sql`
    DELETE FROM ${tags}
    WHERE ${tags.projectId} = ${projectId}
      AND NOT EXISTS (
        SELECT 1 FROM ${featureTags} WHERE ${featureTags.tagId} = ${tags.id}
      )
  `);
}
