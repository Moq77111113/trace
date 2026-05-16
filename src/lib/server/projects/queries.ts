import { db } from '$lib/server/db/client';
import { projects, features, executions } from '$lib/server/db/schema';
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
        status:     executions.status,
        finishedAt: executions.finishedAt,
        rn:         sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${features.projectId}
          ORDER BY ${executions.finishedAt} DESC NULLS LAST
        )`.as('rn'),
      })
      .from(executions)
      .innerJoin(features, eq(executions.featureId, features.id))
      .where(ne(executions.status, 'IN_PROGRESS')),
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

export async function listRecentExecutions(limit = 20) {
  return db
    .select({
      id:          executions.id,
      status:      executions.status,
      source:      executions.source,
      executedBy:  executions.executedBy,
      startedAt:   executions.startedAt,
      featureName: features.name,
      projectId:   features.projectId,
    })
    .from(executions)
    .innerJoin(features, eq(executions.featureId, features.id))
    .orderBy(desc(executions.startedAt))
    .limit(limit);
}
