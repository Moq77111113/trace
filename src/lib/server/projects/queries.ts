import { db } from '$lib/server/db/client';
import { projects, features, executions } from '$lib/server/db/schema';
import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';

export async function getProjectBySlug(slug: string) {
  return db.query.projects.findFirst({ where: eq(projects.slug, slug) });
}

export async function getProjectIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug));
  return row?.id ?? null;
}

export async function listProjectsWithStats(accessibleProjectIds: Set<string>) {
  if (accessibleProjectIds.size === 0) return [];
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
      slug:          projects.slug,
      name:          projects.name,
      description:   projects.description,
      featureCount:  sql<number>`COALESCE(${featureAgg.cnt}, 0)`,
      lastRunStatus: ranked.status,
    })
    .from(projects)
    .leftJoin(featureAgg, eq(featureAgg.projectId, projects.id))
    .leftJoin(ranked,     and(eq(ranked.projectId, projects.id), eq(ranked.rn, 1)))
    .where(and(eq(projects.archived, false), inArray(projects.id, [...accessibleProjectIds])))
    .orderBy(desc(projects.updatedAt));
}

export type ProjectDashboardStats = {
  passed7d:    number;
  finished7d:  number;
  runsToday:   number;
  medianMs7d:  number | null;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getProjectDashboardStats(projectId: string): Promise<ProjectDashboardStats> {
  const since7d      = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const startOfToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })();

  const [row] = await db
    .select({
      passed7d:   sql<number>`COUNT(*) FILTER (
        WHERE ${executions.finishedAt} >= ${since7d}::timestamptz AND ${executions.status} = 'PASSED'
      )::int`,
      finished7d: sql<number>`COUNT(*) FILTER (
        WHERE ${executions.finishedAt} >= ${since7d}::timestamptz
          AND ${executions.status} IN ('PASSED','FAILED','SKIPPED','ABORTED')
      )::int`,
      runsToday:  sql<number>`COUNT(*) FILTER (
        WHERE ${executions.startedAt} >= ${startOfToday}::timestamptz
      )::int`,
      medianMs7d: sql<number | null>`PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (${executions.finishedAt} - ${executions.startedAt})) * 1000
      ) FILTER (
        WHERE ${executions.finishedAt} >= ${since7d}::timestamptz AND ${executions.finishedAt} IS NOT NULL
      )`,
    })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .where(eq(features.projectId, projectId));

  return {
    passed7d:   row?.passed7d   ?? 0,
    finished7d: row?.finished7d ?? 0,
    runsToday:  row?.runsToday  ?? 0,
    medianMs7d: row?.medianMs7d != null ? Math.round(Number(row.medianMs7d)) : null,
  };
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
      featureCode: sql<string>`${projects.codePrefix} || '-' || ${features.codeSeq}`,
      projectId:   features.projectId,
      projectSlug: projects.slug,
    })
    .from(executions)
    .innerJoin(features, eq(executions.featureId, features.id))
    .innerJoin(projects, eq(projects.id, features.projectId))
    .orderBy(desc(executions.startedAt))
    .limit(limit);
}
