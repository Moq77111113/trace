import { asc, eq, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { manualScenarioSteps } from '$lib/server/db/schema';

const scenarioId = z.uuid({ version: 'v7' });
const stepId     = z.uuid({ version: 'v7' });

export const STEP_TEXT_MAX = 2000;

export const stepAction = z.string().trim().min(1).max(STEP_TEXT_MAX);
export const stepExpected = z
  .string()
  .trim()
  .max(STEP_TEXT_MAX)
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

export const addStepInput     = z.object({ scenarioId, action: stepAction, expected: stepExpected });
export const editStepInput    = z.object({ stepId, action: stepAction, expected: stepExpected });
export const removeStepInput   = z.object({ stepId });
export const listStepsInput    = z.object({ scenarioId });
export const reorderStepsInput = z.object({ scenarioId, order: z.array(stepId).min(1) });

export type ManualScenarioStepRow = typeof manualScenarioSteps.$inferSelect;

export async function addStep(input: z.input<typeof addStepInput>): Promise<ManualScenarioStepRow> {
  const parsed = addStepInput.parse(input);
  return db.transaction(async (tx) => {
    const [agg] = await tx
      .select({ next: sql<number>`coalesce(${max(manualScenarioSteps.position)}, 0) + 1` })
      .from(manualScenarioSteps)
      .where(eq(manualScenarioSteps.scenarioId, parsed.scenarioId));
    if (!agg) throw new Error('addStep: position aggregate returned no rows');
    const [row] = await tx
      .insert(manualScenarioSteps)
      .values({ scenarioId: parsed.scenarioId, position: agg.next, action: parsed.action, expected: parsed.expected })
      .returning();
    if (!row) throw new Error('addStep: insert returned no row');
    return row;
  });
}

export async function listSteps(input: z.infer<typeof listStepsInput>): Promise<ManualScenarioStepRow[]> {
  const parsed = listStepsInput.parse(input);
  return db
    .select()
    .from(manualScenarioSteps)
    .where(eq(manualScenarioSteps.scenarioId, parsed.scenarioId))
    .orderBy(asc(manualScenarioSteps.position));
}

export async function editStep(input: z.input<typeof editStepInput>): Promise<ManualScenarioStepRow> {
  const parsed = editStepInput.parse(input);
  const [row] = await db
    .update(manualScenarioSteps)
    .set({ action: parsed.action, expected: parsed.expected, updatedAt: new Date() })
    .where(eq(manualScenarioSteps.id, parsed.stepId))
    .returning();
  if (!row) throw new Error(`editStep: step ${parsed.stepId} not found`);
  return row;
}

export async function removeStep(input: z.infer<typeof removeStepInput>): Promise<void> {
  const parsed = removeStepInput.parse(input);
  await db.delete(manualScenarioSteps).where(eq(manualScenarioSteps.id, parsed.stepId));
}

export async function reorderSteps(input: z.infer<typeof reorderStepsInput>): Promise<void> {
  const parsed = reorderStepsInput.parse(input);
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: manualScenarioSteps.id })
      .from(manualScenarioSteps)
      .where(eq(manualScenarioSteps.scenarioId, parsed.scenarioId));
    const ids = new Set(existing.map((r) => r.id));
    if (parsed.order.length !== ids.size || parsed.order.some((id) => !ids.has(id))) {
      throw new Error('reorderSteps: order set does not match the scenario steps');
    }
    const shift = parsed.order.length;
    for (const [i, id] of parsed.order.entries()) {
      await tx.update(manualScenarioSteps).set({ position: shift + i + 1 }).where(eq(manualScenarioSteps.id, id));
    }
    for (const [i, id] of parsed.order.entries()) {
      await tx.update(manualScenarioSteps).set({ position: i + 1, updatedAt: new Date() }).where(eq(manualScenarioSteps.id, id));
    }
  });
}
