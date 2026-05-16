import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, featureGroups, executions, scenarioResults } from '$lib/server/db/schema';
import type { ScenarioCounts } from '$lib/entities/execution/lib/format';

export async function listFeatures(projectId: string) {
  const ranked = db.$with('ranked_runs').as(
    db
      .select({
        featureId:  executions.featureId,
        status:     executions.status,
        finishedAt: executions.finishedAt,
        rn:         sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${executions.featureId}
          ORDER BY ${executions.finishedAt} DESC NULLS LAST
        )`.as('rn'),
      })
      .from(executions)
      .where(ne(executions.status, 'IN_PROGRESS')),
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
  latestFinishedStatus: (typeof executions.status.enumValues)[number] | null;
  lastRunAt:            Date | null;
  latestCounts:         ScenarioCounts | null;
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
        featureId:   executions.featureId,
        executionId: executions.id,
        status:      executions.status,
        finishedAt:  executions.finishedAt,
        rn: sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${executions.featureId}
          ORDER BY ${executions.finishedAt} DESC NULLS LAST
        )`.as('rn'),
      })
      .from(executions)
      .where(ne(executions.status, 'IN_PROGRESS')),
  );

  const lastStarted = db.$with('last_started').as(
    db
      .select({
        featureId:     executions.featureId,
        lastStartedAt: sql<Date>`MAX(${executions.startedAt})`.as('last_started_at'),
      })
      .from(executions)
      .groupBy(executions.featureId),
  );

  const rows = await db
    .with(ranked, lastStarted)
    .select({
      id:                   features.id,
      projectId:            features.projectId,
      groupId:              features.groupId,
      name:                 features.name,
      parseErrors:          features.parseErrors,
      version:              features.version,
      updatedAt:            features.updatedAt,
      latestFinishedStatus: ranked.status,
      latestExecutionId:    ranked.executionId,
      lastRunAt:            lastStarted.lastStartedAt,
    })
    .from(features)
    .leftJoin(ranked,      and(eq(ranked.featureId,      features.id), eq(ranked.rn, 1)))
    .leftJoin(lastStarted,     eq(lastStarted.featureId, features.id))
    .where(and(eq(features.projectId, projectId), eq(features.archived, false)))
    .orderBy(asc(features.name));

  const latestExecutionIds = rows
    .map((r) => r.latestExecutionId)
    .filter((id): id is string => id !== null);

  const countsByExecution = new Map<string, ScenarioCounts>();
  if (latestExecutionIds.length > 0) {
    const countRows = await db
      .select({
        executionId: scenarioResults.executionId,
        passed:  sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'PASSED'  THEN 1 ELSE 0 END), 0)::int`,
        failed:  sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'FAILED'  THEN 1 ELSE 0 END), 0)::int`,
        skipped: sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'SKIPPED' THEN 1 ELSE 0 END), 0)::int`,
        pending: sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'PENDING' THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(scenarioResults)
      .where(inArray(scenarioResults.executionId, latestExecutionIds))
      .groupBy(scenarioResults.executionId);

    for (const c of countRows) {
      countsByExecution.set(c.executionId, {
        passed:  c.passed,
        failed:  c.failed,
        skipped: c.skipped,
        pending: c.pending,
      });
    }
  }

  const groups = await db
    .select()
    .from(featureGroups)
    .where(eq(featureGroups.projectId, projectId))
    .orderBy(asc(featureGroups.position));

  const byGroup = new Map<string, FeatureRow[]>();
  const ungrouped: FeatureRow[] = [];
  for (const r of rows) {
    const { groupId, latestExecutionId, ...rest } = r;
    const row: FeatureRow = {
      ...rest,
      latestCounts: latestExecutionId ? countsByExecution.get(latestExecutionId) ?? null : null,
    };
    if (groupId) {
      const arr = byGroup.get(groupId) ?? [];
      arr.push(row);
      byGroup.set(groupId, arr);
    } else {
      ungrouped.push(row);
    }
  }

  return {
    groups: groups.map((g) => ({ group: g, features: byGroup.get(g.id) ?? [] })),
    ungrouped,
  };
}
