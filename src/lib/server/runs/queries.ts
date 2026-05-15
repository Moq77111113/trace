import { and, asc, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { attachments, features, projects, runs, scenarioResults } from '$lib/server/db/schema';

export type RunStatusFilter = 'PASSED' | 'FAILED' | 'SKIPPED' | 'RUNNING';
export type RunSourceFilter = 'MANUAL' | 'CI';
export type GroupFilter     = string | 'ungrouped';

export type RunFilters = {
  status?:       RunStatusFilter;
  source?:       RunSourceFilter;
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

function buildConditions(projectId: string, f: RunFilters): SQL[] {
  const conds: SQL[] = [eq(features.projectId, projectId)];

  if (f.status)      conds.push(eq(runs.status, f.status));
  if (f.source)      conds.push(eq(runs.source, f.source));
  if (f.environment) conds.push(eq(runs.environment, f.environment));
  if (f.featureId)   conds.push(eq(features.id, f.featureId));
  if (f.groupId === 'ungrouped') conds.push(isNull(features.groupId));
  else if (f.groupId)            conds.push(eq(features.groupId, f.groupId));
  if (f.from) conds.push(gte(runs.startedAt, f.from));
  if (f.to)   conds.push(lte(runs.startedAt, f.to));

  return conds;
}

export async function listRunsForProject(projectId: string, f: RunFilters = {}) {
  const page     = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, f.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset   = (page - 1) * pageSize;

  const conds = buildConditions(projectId, f);

  const rows = await db
    .select({
      id:          runs.id,
      status:      runs.status,
      source:      runs.source,
      executedBy:  runs.executedBy,
      environment: runs.environment,
      startedAt:   runs.startedAt,
      finishedAt:  runs.finishedAt,
      featureId:   features.id,
      featureName: features.name,
    })
    .from(runs)
    .innerJoin(features, eq(features.id, runs.featureId))
    .where(and(...conds))
    .orderBy(desc(runs.startedAt))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(runs)
    .innerJoin(features, eq(features.id, runs.featureId))
    .where(and(...conds));

  return { rows, page, pageSize, total: totalRow?.count ?? 0 };
}

/** Distinct non-null environments seen on any run in the project, alphabetical. */
export async function listRunEnvironments(projectId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ environment: runs.environment })
    .from(runs)
    .innerJoin(features, eq(features.id, runs.featureId))
    .where(eq(features.projectId, projectId))
    .orderBy(asc(runs.environment));

  return rows.map((r) => r.environment).filter((e): e is string => e !== null);
}

export type RunPageData = Awaited<ReturnType<typeof loadRunPage>>;

/**
 * Single-query load for the run page: head row + ordered scenario_results.
 * The `mode` discriminator lets the route component pick the live vs read-only
 * renderer without re-checking `run.status` in the view layer.
 */
export async function loadRunPage(runId: string) {
  const [head] = await db
    .select({
      run:     runs,
      feature: features,
      project: projects,
    })
    .from(runs)
    .innerJoin(features, eq(features.id, runs.featureId))
    .innerJoin(projects, eq(projects.id, features.projectId))
    .where(eq(runs.id, runId));

  if (!head) return null;

  const scenarios = await db
    .select()
    .from(scenarioResults)
    .where(eq(scenarioResults.runId, runId))
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

  const mode = head.run.status === 'RUNNING' ? 'live' as const : 'readonly' as const;

  return {
    mode,
    run:                   head.run,
    feature:               head.feature,
    project:               head.project,
    scenarios,
    attachmentsByScenario,
  };
}
