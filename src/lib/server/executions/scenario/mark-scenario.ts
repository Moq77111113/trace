import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { recomputeScenarioStatus } from './recompute-status';

export const scenarioStatus = z.enum(['PASSED', 'FAILED', 'SKIPPED']);
export type ScenarioStatus  = z.infer<typeof scenarioStatus>;

export const markScenarioInput = z.object({
  executionId:      z.uuid({ version: 'v7' }),
  scenarioResultId: z.uuid({ version: 'v7' }),
  status:           scenarioStatus,
  durationMs:       z.number().int().nonnegative().optional(),
  logs:             z.string().nullable().optional(),
  errorMessage:     z.string().nullable().optional(),
});

export type MarkScenarioInput = z.infer<typeof markScenarioInput>;

/** Fast-path: fills the scenario's PENDING steps with the verdict, then derives its status. */
export async function markScenario(input: MarkScenarioInput) {
  const [run] = await db.select().from(executions).where(eq(executions.id, input.executionId));
  if (!run) throw new Error(`markScenario: run ${input.executionId} not found`);
  if (run.status !== 'IN_PROGRESS') throw new Error(`markScenario: run ${input.executionId} is not RUNNING`);

  return db.transaction(async (tx) => {
    const [scenario] = await tx.select().from(scenarioResults).where(and(
      eq(scenarioResults.id, input.scenarioResultId),
      eq(scenarioResults.executionId, input.executionId),
    ));
    if (!scenario) throw new Error(`markScenario: scenario ${input.scenarioResultId} not found in run ${input.executionId}`);

    await tx.update(scenarioResultSteps)
      .set({ verdict: input.status, updatedAt: new Date() })
      .where(and(
        eq(scenarioResultSteps.scenarioResultId, scenario.id),
        eq(scenarioResultSteps.verdict, 'PENDING'),
      ));

    await tx.update(scenarioResults).set({
      durationMs:   input.durationMs   ?? null,
      logs:         input.logs         ?? null,
      errorMessage: input.errorMessage ?? null,
      updatedAt:    new Date(),
    }).where(eq(scenarioResults.id, scenario.id));

    const stepCount = await tx.$count(scenarioResultSteps, eq(scenarioResultSteps.scenarioResultId, scenario.id));
    if (stepCount === 0) {
      await tx.update(scenarioResults).set({ status: input.status, updatedAt: new Date() }).where(eq(scenarioResults.id, scenario.id));
    } else {
      await recomputeScenarioStatus(tx, scenario.id);
    }

    const [updated] = await tx.select().from(scenarioResults).where(eq(scenarioResults.id, scenario.id));
    return updated;
  });
}
