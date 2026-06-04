import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { executions, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { recomputeScenarioStatus } from '../scenario/recompute-status';

export const stepVerdict = z.enum(['PENDING', 'PASSED', 'FAILED', 'SKIPPED']);
export type StepVerdict  = z.infer<typeof stepVerdict>;

export const markStepInput = z.object({
  executionId:          z.uuid({ version: 'v7' }),
  scenarioResultStepId: z.uuid({ version: 'v7' }),
  verdict:              stepVerdict,
});

export type MarkStepInput = z.infer<typeof markStepInput>;

/**
 * Persists a verdict for one step inside a RUNNING run, then recomputes the
 * parent scenario's rollup status. PENDING is allowed so a tester can un-mark a
 * step. Refuses to write into a finished run; refuses if the step does not
 * belong to this run.
 */
export async function markStep(input: MarkStepInput) {
  const [run] = await db.select().from(executions).where(eq(executions.id, input.executionId));
  if (!run) throw new Error(`markStep: run ${input.executionId} not found`);
  if (run.status !== 'IN_PROGRESS') throw new Error(`markStep: run ${input.executionId} is not RUNNING`);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ scenarioResultId: scenarioResults.id })
      .from(scenarioResultSteps)
      .innerJoin(scenarioResults, eq(scenarioResults.id, scenarioResultSteps.scenarioResultId))
      .where(and(
        eq(scenarioResultSteps.id, input.scenarioResultStepId),
        eq(scenarioResults.executionId, input.executionId),
      ));
    if (!row) throw new Error(`markStep: step ${input.scenarioResultStepId} not found in run ${input.executionId}`);

    await tx.update(scenarioResultSteps)
      .set({ verdict: input.verdict, updatedAt: new Date() })
      .where(eq(scenarioResultSteps.id, input.scenarioResultStepId));

    await recomputeScenarioStatus(tx, row.scenarioResultId);

    const [updated] = await tx.select().from(scenarioResultSteps)
      .where(eq(scenarioResultSteps.id, input.scenarioResultStepId));
    return { step: updated, scenarioResultId: row.scenarioResultId };
  });
}
