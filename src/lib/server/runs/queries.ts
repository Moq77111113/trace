import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects, runs, scenarioResults } from '$lib/server/db/schema';

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

  const mode = head.run.status === 'RUNNING' ? 'live' as const : 'readonly' as const;

  return { mode, run: head.run, feature: head.feature, project: head.project, scenarios };
}
