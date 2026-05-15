import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, featureGroups, runs } from '$lib/server/db/schema';

export async function listFeatures(projectId: string) {
  const ranked = db.$with('ranked_runs').as(
    db
      .select({
        featureId:  runs.featureId,
        status:     runs.status,
        finishedAt: runs.finishedAt,
        rn:         sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${runs.featureId}
          ORDER BY ${runs.finishedAt} DESC NULLS LAST
        )`.as('rn'),
      })
      .from(runs)
      .where(ne(runs.status, 'RUNNING')),
  );

  return db
    .with(ranked)
    .select({
      id:                   features.id,
      projectId:            features.projectId,
      name:                 features.name,
      parseErrors:          features.parseErrors,
      version:              features.version,
      updatedAt:            features.updatedAt,
      latestFinishedStatus: ranked.status,
    })
    .from(features)
    .leftJoin(ranked, and(eq(ranked.featureId, features.id), eq(ranked.rn, 1)))
    .where(and(eq(features.projectId, projectId), eq(features.archived, false)))
    .orderBy(desc(features.updatedAt));
}

export async function getFeature(featureId: string) {
  return db.query.features.findFirst({ where: eq(features.id, featureId) });
}

type FeatureRow = {
  id:                   string;
  projectId:            string;
  name:                 string;
  parseErrors:          (typeof features.$inferSelect)['parseErrors'];
  version:              number;
  updatedAt:            Date;
  latestFinishedStatus: (typeof runs.status.enumValues)[number] | null;
};

type GroupRow = typeof featureGroups.$inferSelect;

/** Features partitioned into named groups (ordered by position) and an ungrouped remainder. */
export type FeaturesByGroup = {
  groups:    { group: GroupRow; features: FeatureRow[] }[];
  ungrouped: FeatureRow[];
};

/** Returns all non-archived features for a project, partitioned by group. */
export async function listFeaturesByGroup(projectId: string): Promise<FeaturesByGroup> {
  const ranked = db.$with('ranked_runs').as(
    db
      .select({
        featureId:  runs.featureId,
        status:     runs.status,
        finishedAt: runs.finishedAt,
        rn:         sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${runs.featureId}
          ORDER BY ${runs.finishedAt} DESC NULLS LAST
        )`.as('rn'),
      })
      .from(runs)
      .where(ne(runs.status, 'RUNNING')),
  );

  const rows = await db
    .with(ranked)
    .select({
      id:                   features.id,
      projectId:            features.projectId,
      groupId:              features.groupId,
      name:                 features.name,
      parseErrors:          features.parseErrors,
      version:              features.version,
      updatedAt:            features.updatedAt,
      latestFinishedStatus: ranked.status,
    })
    .from(features)
    .leftJoin(ranked, and(eq(ranked.featureId, features.id), eq(ranked.rn, 1)))
    .where(and(eq(features.projectId, projectId), eq(features.archived, false)))
    .orderBy(asc(features.name));

  const groups = await db
    .select()
    .from(featureGroups)
    .where(eq(featureGroups.projectId, projectId))
    .orderBy(asc(featureGroups.position));

  const byGroup = new Map<string, FeatureRow[]>();
  const ungrouped: FeatureRow[] = [];
  for (const r of rows) {
    const { groupId, ...rest } = r;
    if (groupId) {
      const arr = byGroup.get(groupId) ?? [];
      arr.push(rest);
      byGroup.set(groupId, arr);
    } else {
      ungrouped.push(rest);
    }
  }

  return {
    groups: groups.map((g) => ({ group: g, features: byGroup.get(g.id) ?? [] })),
    ungrouped,
  };
}
