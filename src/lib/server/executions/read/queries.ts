import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { attachments, executions, features, projects, scenarioResults } from '$lib/server/db/schema';
import type { CiMetadata } from '$lib/entities/execution/lib/ci-metadata';
import { EXPORT_ROW_CAP } from '$lib/features/csv-export/lib/csv';

export type ExecutionStatusFilter = 'PASSED' | 'FAILED' | 'SKIPPED' | 'ABORTED' | 'IN_PROGRESS';
export type ExecutionSourceFilter = 'MANUAL' | 'CI';
export type GroupFilter     = string | 'ungrouped';

export type ExecutionFilters = {
  status?:       ExecutionStatusFilter;
  source?:       ExecutionSourceFilter;
  environment?:  string;
  featureId?:    string;
  groupId?:      GroupFilter;
  from?:         Date;
  to?:           Date;
  page?:         number;
  pageSize?:     number;
};

const MAX_PAGE_SIZE     = 100;
const DEFAULT_PAGE_SIZE = 50;

export const FLAKE_WINDOW = 10;

function buildConditions(projectId: string, f: ExecutionFilters): SQL[] {
  const conds: SQL[] = [eq(features.projectId, projectId)];

  if (f.status)      conds.push(eq(executions.status, f.status));
  if (f.source)      conds.push(eq(executions.source, f.source));
  if (f.environment) conds.push(eq(executions.environment, f.environment));
  if (f.featureId)   conds.push(eq(features.id, f.featureId));
  if (f.groupId === 'ungrouped') conds.push(isNull(features.groupId));
  else if (f.groupId)            conds.push(eq(features.groupId, f.groupId));
  if (f.from) conds.push(gte(executions.startedAt, f.from));
  if (f.to)   conds.push(lte(executions.startedAt, f.to));

  return conds;
}

const featureCodeSql = sql<string>`${projects.codePrefix} || '-' || ${features.codeSeq}`;

export async function listExecutionsForProject(projectId: string, f: ExecutionFilters = {}) {
  const page     = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, f.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset   = (page - 1) * pageSize;

  const conds = buildConditions(projectId, f);

  const rows = await db
    .select({
      id:          executions.id,
      status:      executions.status,
      source:      executions.source,
      executedBy:  executions.executedBy,
      environment: executions.environment,
      startedAt:   executions.startedAt,
      finishedAt:  executions.finishedAt,
      ciMetadata:  executions.ciMetadata,
      featureId:   features.id,
      featureName: features.name,
      featureCode: featureCodeSql,
      passed:  sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'PASSED'  THEN 1 ELSE 0 END), 0)::int`,
      failed:  sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'FAILED'  THEN 1 ELSE 0 END), 0)::int`,
      skipped: sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'SKIPPED' THEN 1 ELSE 0 END), 0)::int`,
      pending: sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'PENDING' THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .innerJoin(projects, eq(projects.id, features.projectId))
    .leftJoin(scenarioResults, eq(scenarioResults.executionId, executions.id))
    .where(and(...conds))
    .groupBy(executions.id, features.id, features.name, projects.codePrefix, features.codeSeq)
    .orderBy(desc(executions.startedAt))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .where(and(...conds));

  return { rows, page, pageSize, total: totalRow?.count ?? 0 };
}

export type ExecutionExportRow = {
  id:          string;
  status:      string;
  source:      string;
  executedBy:  string;
  environment: string | null;
  startedAt:   Date;
  finishedAt:  Date | null;
  ciMetadata:  CiMetadata | null;
  featureName: string;
  featureCode: string;
  passed:      number;
  failed:      number;
  skipped:     number;
  pending:     number;
};

/**
 * Flat (un-paged) export of executions matching `f`. Capped at EXPORT_ROW_CAP + 1
 * rows so callers can detect overflow without a separate COUNT query.
 */
export async function listExecutionsForExport(projectId: string, f: ExecutionFilters = {}): Promise<ExecutionExportRow[]> {
  const conds = buildConditions(projectId, f);

  return db
    .select({
      id:          executions.id,
      status:      executions.status,
      source:      executions.source,
      executedBy:  executions.executedBy,
      environment: executions.environment,
      startedAt:   executions.startedAt,
      finishedAt:  executions.finishedAt,
      ciMetadata:  executions.ciMetadata,
      featureName: features.name,
      featureCode: featureCodeSql,
      passed:  sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'PASSED'  THEN 1 ELSE 0 END), 0)::int`,
      failed:  sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'FAILED'  THEN 1 ELSE 0 END), 0)::int`,
      skipped: sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'SKIPPED' THEN 1 ELSE 0 END), 0)::int`,
      pending: sql<number>`COALESCE(SUM(CASE WHEN ${scenarioResults.status} = 'PENDING' THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .innerJoin(projects, eq(projects.id, features.projectId))
    .leftJoin(scenarioResults, eq(scenarioResults.executionId, executions.id))
    .where(and(...conds))
    .groupBy(executions.id, features.id, features.name, projects.codePrefix, features.codeSeq)
    .orderBy(desc(executions.startedAt))
    .limit(EXPORT_ROW_CAP + 1);
}

export async function listRecentExecutionsForFeature(featureId: string, limit = 5) {
  return db
    .select({
      id:          executions.id,
      status:      executions.status,
      source:      executions.source,
      environment: executions.environment,
      startedAt:   executions.startedAt,
      finishedAt:  executions.finishedAt,
    })
    .from(executions)
    .where(eq(executions.featureId, featureId))
    .orderBy(desc(executions.startedAt))
    .limit(limit);
}

/**
 * Feature IDs that look flaky: among the last FLAKE_WINDOW finished executions
 * (PASSED/FAILED/ABORTED — anything not IN_PROGRESS), at least one PASSED and at
 * least one FAILED. SKIPPED alone never makes a feature flaky.
 */
export async function listFlakeFeatureIds(projectId: string): Promise<Set<string>> {
  const ranked = db.$with('ranked_finished').as(
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
      .innerJoin(features, eq(features.id, executions.featureId))
      .where(and(eq(features.projectId, projectId), ne(executions.status, 'IN_PROGRESS'))),
  );

  const rows = await db
    .with(ranked)
    .select({
      featureId: ranked.featureId,
      passes:    sql<number>`SUM(CASE WHEN ${ranked.status} = 'PASSED' THEN 1 ELSE 0 END)::int`,
      fails:     sql<number>`SUM(CASE WHEN ${ranked.status} = 'FAILED' THEN 1 ELSE 0 END)::int`,
    })
    .from(ranked)
    .where(lte(ranked.rn, FLAKE_WINDOW))
    .groupBy(ranked.featureId)
    .having(sql`SUM(CASE WHEN ${ranked.status} = 'PASSED' THEN 1 ELSE 0 END) > 0
            AND SUM(CASE WHEN ${ranked.status} = 'FAILED' THEN 1 ELSE 0 END) > 0`);

  return new Set(rows.map((r) => r.featureId));
}

/** Distinct non-null environments seen on any run in the project, alphabetical. */
export async function listExecutionEnvironments(projectId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ environment: executions.environment })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .where(eq(features.projectId, projectId))
    .orderBy(asc(executions.environment));

  return rows.map((r) => r.environment).filter((e): e is string => e !== null);
}

export type ExecutionPageData = Awaited<ReturnType<typeof loadExecutionPage>>;

/**
 * Single-query load for the run page: head row + ordered scenario_results.
 * The `mode` discriminator lets the route component pick the live vs read-only
 * renderer without re-checking `run.status` in the view layer.
 */
export async function loadExecutionPage(executionId: string) {
  const [head] = await db
    .select({
      execution: executions,
      feature: features,
      project: projects,
    })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .innerJoin(projects, eq(projects.id, features.projectId))
    .where(eq(executions.id, executionId));

  if (!head) return null;

  const scenarios = await db
    .select()
    .from(scenarioResults)
    .where(eq(scenarioResults.executionId, executionId))
    .orderBy(asc(scenarioResults.source), asc(scenarioResults.position));

  const scenarioIds = scenarios.map((s) => s.id);
  const atts = scenarioIds.length
    ? await db.select({
        id:               attachments.id,
        scenarioResultId: attachments.scenarioResultId,
        filename:         attachments.filename,
        mimeType:         attachments.mimeType,
        sizeBytes:        attachments.sizeBytes,
      })
      .from(attachments)
      .where(inArray(attachments.scenarioResultId, scenarioIds))
    : [];

  const attachmentsByScenario: Record<string, typeof atts> = {};
  for (const a of atts) {
    if (!a.scenarioResultId) continue;
    (attachmentsByScenario[a.scenarioResultId] ??= []).push(a);
  }

  const mode = head.execution.status === 'IN_PROGRESS' ? 'live' as const : 'readonly' as const;

  return {
    mode,
    execution: head.execution,
    feature:               head.feature,
    project:               head.project,
    scenarios,
    attachmentsByScenario,
  };
}
