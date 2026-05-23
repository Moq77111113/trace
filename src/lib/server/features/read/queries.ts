import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, featureGroups, projects, executions, scenarioResults, tags, featureTags } from '$lib/server/db/schema';
import { parseFeatureCode } from '$lib/shared/lib/slug';
import type { ScenarioCounts } from '$lib/entities/execution/lib/format';
import type { Authorizer } from '$lib/server/authz/authorizer';
import { visibleFeatureIds } from '$lib/server/features/authz';

export type ProjectTag = { name: string; count: number };

/**
 * Lists a project's tags with their usage count, ordered by count desc, then
 * name asc. Tags not linked to any feature surface with `count = 0`.
 */
export async function listProjectTags(projectId: string): Promise<ProjectTag[]> {
  const tagCounts = db.$with('tag_counts').as(
    db
      .select({
        tagId: featureTags.tagId,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(featureTags)
      .groupBy(featureTags.tagId),
  );

  return db
    .with(tagCounts)
    .select({
      name:  tags.name,
      count: sql<number>`COALESCE(${tagCounts.count}, 0)`,
    })
    .from(tags)
    .leftJoin(tagCounts, eq(tagCounts.tagId, tags.id))
    .where(eq(tags.projectId, projectId))
    .orderBy(desc(sql`COALESCE(${tagCounts.count}, 0)`), tags.name);
}

const featureCodeSql = sql<string>`${projects.codePrefix} || '-' || ${features.codeSeq}`;

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
      projectSlug:          projects.slug,
      name:                 features.name,
      code:                 featureCodeSql,
      parseErrors:          features.parseErrors,
      version:              features.version,
      updatedAt:            features.updatedAt,
      latestFinishedStatus: ranked.status,
    })
    .from(features)
    .innerJoin(projects, eq(projects.id, features.projectId))
    .leftJoin(ranked, and(eq(ranked.featureId, features.id), eq(ranked.rn, 1)))
    .where(and(eq(features.projectId, projectId), eq(features.archived, false)))
    .orderBy(desc(features.updatedAt));
}

export async function getFeature(featureId: string) {
  return db.query.features.findFirst({ where: eq(features.id, featureId) });
}

export async function getFeatureByCode(projectId: string, codeSeq: number) {
  return db.query.features.findFirst({
    where: and(eq(features.projectId, projectId), eq(features.codeSeq, codeSeq)),
  });
}

/**
 * Resolves a feature id from a project slug + feature code (e.g. `TRC-7`).
 * Returns `null` when either side does not match. Used by route actions that
 * receive the slug+code pair from URL params.
 */
export async function resolveFeatureIdByCode(slug: string, code: string): Promise<string | null> {
  const parsed = parseFeatureCode(code);
  if (!parsed) return null;
  const [row] = await db
    .select({ id: features.id })
    .from(features)
    .innerJoin(projects, eq(projects.id, features.projectId))
    .where(
      and(
        eq(projects.slug, slug),
        eq(projects.codePrefix, parsed.prefix),
        eq(features.codeSeq, parsed.seq),
      ),
    );
  return row?.id ?? null;
}

type FeatureRow = {
  id:                   string;
  projectId:            string;
  projectSlug:          string;
  name:                 string;
  code:                 string;
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

/** Returns all non-archived features for a project that `authz` may view, partitioned by group. */
export async function listFeaturesByGroup(authz: Authorizer, projectId: string): Promise<FeaturesByGroup> {
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
      projectSlug:          projects.slug,
      groupId:              features.groupId,
      name:                 features.name,
      code:                 featureCodeSql,
      parseErrors:          features.parseErrors,
      version:              features.version,
      updatedAt:            features.updatedAt,
      latestFinishedStatus: ranked.status,
      latestExecutionId:    ranked.executionId,
      lastRunAt:            lastStarted.lastStartedAt,
    })
    .from(features)
    .innerJoin(projects,       eq(projects.id,           features.projectId))
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

  const visible = await visibleFeatureIds(authz, projectId, 'feature.view');

  return {
    groups: groups.map((g) => ({
      group: g,
      features: (byGroup.get(g.id) ?? []).filter((f) => visible.has(f.id)),
    })),
    ungrouped: ungrouped.filter((f) => visible.has(f.id)),
  };
}
