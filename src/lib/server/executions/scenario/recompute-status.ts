import { eq } from 'drizzle-orm';
import { scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { deriveScenarioStatus } from '$lib/entities/execution/lib/derive-scenario-status';
import type { db as Db } from '$lib/server/db/client';

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

/** Derives and persists a scenario's status from its step verdicts. */
export async function recomputeScenarioStatus(tx: Tx, scenarioResultId: string): Promise<void> {
  const steps = await tx.select({ verdict: scenarioResultSteps.verdict })
    .from(scenarioResultSteps)
    .where(eq(scenarioResultSteps.scenarioResultId, scenarioResultId));

  const status = deriveScenarioStatus(steps.map((s) => s.verdict));
  await tx.update(scenarioResults).set({ status, updatedAt: new Date() })
    .where(eq(scenarioResults.id, scenarioResultId));
}
