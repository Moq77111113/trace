import { and, asc, eq, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { manualScenarios } from '$lib/server/db/schema';

const featureId = z.uuid({ version: 'v7' });
const scenarioId = z.uuid({ version: 'v7' });
const name = z.string().trim().min(1).max(200);

export const addInput = z.object({ featureId, name });
export const renameInput = z.object({ scenarioId, name });
export const archiveInput = z.object({ scenarioId });
export const listInput = z.object({ featureId });
export const reorderInput = z.object({ featureId, order: z.array(scenarioId).min(1) });

export type ManualScenarioRow = typeof manualScenarios.$inferSelect;

export async function addManualScenario(input: z.infer<typeof addInput>): Promise<ManualScenarioRow> {
  const parsed = addInput.parse(input);
  return db.transaction(async (tx) => {
    const [agg] = await tx
      .select({ next: sql<number>`coalesce(${max(manualScenarios.position)}, 0) + 1` })
      .from(manualScenarios)
      .where(and(eq(manualScenarios.featureId, parsed.featureId), eq(manualScenarios.archived, false)));
    if (!agg) throw new Error('addManualScenario: position aggregate returned no rows');
    const [row] = await tx
      .insert(manualScenarios)
      .values({ featureId: parsed.featureId, position: agg.next, name: parsed.name })
      .returning();
    if (!row) throw new Error('addManualScenario: insert returned no row');
    return row;
  });
}

export async function listManualScenarios(input: z.infer<typeof listInput>): Promise<ManualScenarioRow[]> {
  const parsed = listInput.parse(input);
  return db
    .select()
    .from(manualScenarios)
    .where(and(eq(manualScenarios.featureId, parsed.featureId), eq(manualScenarios.archived, false)))
    .orderBy(asc(manualScenarios.position));
}

export async function renameManualScenario(input: z.infer<typeof renameInput>): Promise<ManualScenarioRow> {
  const parsed = renameInput.parse(input);
  const [row] = await db
    .update(manualScenarios)
    .set({ name: parsed.name, updatedAt: new Date() })
    .where(eq(manualScenarios.id, parsed.scenarioId))
    .returning();
  if (!row) throw new Error(`renameManualScenario: scenario ${parsed.scenarioId} not found`);
  return row;
}

export async function archiveManualScenario(input: z.infer<typeof archiveInput>): Promise<ManualScenarioRow> {
  const parsed = archiveInput.parse(input);
  const [row] = await db
    .update(manualScenarios)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(manualScenarios.id, parsed.scenarioId))
    .returning();
  if (!row) throw new Error(`archiveManualScenario: scenario ${parsed.scenarioId} not found`);
  return row;
}

export async function reorderManualScenarios(input: z.infer<typeof reorderInput>): Promise<void> {
  const parsed = reorderInput.parse(input);
  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: manualScenarios.id })
      .from(manualScenarios)
      .where(and(eq(manualScenarios.featureId, parsed.featureId), eq(manualScenarios.archived, false)));
    const activeIds = new Set(active.map((r) => r.id));
    if (parsed.order.length !== activeIds.size || parsed.order.some((id) => !activeIds.has(id))) {
      throw new Error('reorderManualScenarios: order set does not match active scenarios');
    }
    // shift to non-overlapping high positions first so we dodge the unique (feature, position) WHERE archived=FALSE index AND the position>=1 check on the way through
    const shift = parsed.order.length;
    for (const [i, id] of parsed.order.entries()) {
      await tx
        .update(manualScenarios)
        .set({ position: shift + i + 1 })
        .where(eq(manualScenarios.id, id));
    }
    for (const [i, id] of parsed.order.entries()) {
      await tx
        .update(manualScenarios)
        .set({ position: i + 1, updatedAt: new Date() })
        .where(eq(manualScenarios.id, id));
    }
  });
}
