import { and, asc, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { attachments, executions, features, projects, scenarioResults } from '$lib/server/db/schema';

export type ExecutionStatusFilter = 'PASSED' | 'FAILED' | 'SKIPPED' | 'IN_PROGRESS';
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
      featureId:   features.id,
      featureName: features.name,
    })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .where(and(...conds))
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
    .orderBy(asc(scenarioResults.scenarioName));

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
