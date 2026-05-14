import { db } from '$lib/server/db/client';
import { projects, features, runs } from '$lib/server/db/schema';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';

export async function listProjectsWithStats() {
  const featureAgg = db.$with('feature_agg').as(
    db
      .select({
        projectId: features.projectId,
        cnt:       count(features.id).as('cnt'),
      })
      .from(features)
      .where(eq(features.archived, false))
      .groupBy(features.projectId),
  );

  const ranked = db.$with('ranked_runs').as(
    db
      .select({
        projectId:  features.projectId,
        status:     runs.status,
        finishedAt: runs.finishedAt,
        rn:         sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${features.projectId}
          ORDER BY ${runs.finishedAt} DESC NULLS LAST
        )`.as('rn'),
      })
      .from(runs)
      .innerJoin(features, eq(runs.featureId, features.id))
      .where(ne(runs.status, 'RUNNING')),
  );

  return db
    .with(featureAgg, ranked)
    .select({
      id:            projects.id,
      name:          projects.name,
      description:   projects.description,
      featureCount:  sql<number>`COALESCE(${featureAgg.cnt}, 0)`,
      lastRunStatus: ranked.status,
    })
    .from(projects)
    .leftJoin(featureAgg, eq(featureAgg.projectId, projects.id))
    .leftJoin(ranked,     and(eq(ranked.projectId, projects.id), eq(ranked.rn, 1)))
    .where(eq(projects.archived, false))
    .orderBy(desc(projects.updatedAt));
}

export async function listRecentRuns(limit = 20) {
  return db
    .select({
      id:          runs.id,
      status:      runs.status,
      source:      runs.source,
      executedBy:  runs.executedBy,
      startedAt:   runs.startedAt,
      featureName: features.name,
      projectId:   features.projectId,
    })
    .from(runs)
    .innerJoin(features, eq(runs.featureId, features.id))
    .orderBy(desc(runs.startedAt))
    .limit(limit);
}
