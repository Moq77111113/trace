import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { executions, features, scenarioResults } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import { listManualScenarios } from '$lib/server/features/manual-scenarios';
import { buildScenarioRows } from './scenario-rows';

export type StartRunInput = {
  featureId:    string;
  executedBy:   string;
  environment?: string | null;
  campaignId?:  string | null;
};

/**
 * Creates a run as an immutable snapshot of the feature at this moment.
 * Inserts one `scenario_results` row per Gherkin scenario (source=GHERKIN) and one
 * per active manual scenario (source=MANUAL), each with a within-source position
 * starting at 1. Archived manual scenarios are excluded. Positions are densified
 * so gaps from archiving do not appear in the snapshot.
 *
 * Rejects features with persisted parse errors, or when neither Gherkin nor
 * active manual scenarios exist (nothing to run).
 */
export async function startExecution(input: StartRunInput) {
  const [feature] = await db.select().from(features).where(eq(features.id, input.featureId));
  if (!feature) throw new Error(`startExecution: feature ${input.featureId} not found`);

  if (feature.parseErrors && feature.parseErrors.length > 0) {
    throw new Error('startExecution: cannot start, feature has parse errors');
  }

  const parsed  = parse(feature.content);
  const manuals = await listManualScenarios({ featureId: feature.id });

  if (parsed.scenarios.length === 0 && manuals.length === 0) {
    throw new Error('startExecution: cannot start, feature has no runnable scenarios');
  }

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(executions)
      .values({
        featureId:             feature.id,
        source:                'MANUAL',
        executedBy:            input.executedBy,
        environment:           input.environment ?? null,
        featureContentAtStart: feature.content,
        campaignId:            input.campaignId ?? null,
      })
      .returning();
    if (!run) throw new Error('startExecution: run insert returned no row');

    const rows = buildScenarioRows([
      ...parsed.scenarios.map((s) => ({ scenarioName: s.name, source: 'GHERKIN' as const })),
      ...manuals.map((m)       => ({ scenarioName: m.name, source: 'MANUAL'  as const })),
    ]);

    await tx.insert(scenarioResults).values(rows.map((r) => ({ ...r, executionId: run.id })));
    return run;
  });
}
