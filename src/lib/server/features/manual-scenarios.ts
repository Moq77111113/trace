import { and, asc, eq, max, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, type DbTx } from '$lib/server/db/client';
import { features, manualScenarios, manualScenarioSteps } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import { stepAction, stepExpected } from './manual-scenario-steps';

const featureId = z.uuid({ version: 'v7' });
const scenarioId = z.uuid({ version: 'v7' });
const name = z.string().trim().min(1).max(200);

export const addInput = z.object({ featureId, name });
export const renameInput = z.object({ scenarioId, name });
export const archiveInput = z.object({ scenarioId });
export const listInput = z.object({ featureId });
export const reorderInput = z.object({ featureId, order: z.array(scenarioId).min(1) });

export type ManualScenarioRow = typeof manualScenarios.$inferSelect;

/** Append an active manual scenario to a feature, guarding the name against gherkin and manual peers. */
export async function appendManualScenario(tx: DbTx, featureId: string, name: string): Promise<ManualScenarioRow> {
  await assertNameAvailable(tx, { featureId, name });
  const [agg] = await tx
    .select({ next: sql<number>`coalesce(${max(manualScenarios.position)}, 0) + 1` })
    .from(manualScenarios)
    .where(and(eq(manualScenarios.featureId, featureId), eq(manualScenarios.archived, false)));
  if (!agg) throw new Error('appendManualScenario: position aggregate returned no rows');
  const [row] = await tx
    .insert(manualScenarios)
    .values({ featureId, position: agg.next, name })
    .returning();
  if (!row) throw new Error('appendManualScenario: insert returned no row');
  return row;
}

export async function addManualScenario(input: z.infer<typeof addInput>): Promise<ManualScenarioRow> {
  const parsed = addInput.parse(input);
  return db.transaction((tx) => appendManualScenario(tx, parsed.featureId, parsed.name));
}

export const addWithStepInput = z.object({ featureId, name, action: stepAction, expected: stepExpected });

export async function addManualScenarioWithStep(input: z.input<typeof addWithStepInput>): Promise<ManualScenarioRow> {
  const parsed = addWithStepInput.parse(input);
  return db.transaction(async (tx) => {
    const scenario = await appendManualScenario(tx, parsed.featureId, parsed.name);
    await tx
      .insert(manualScenarioSteps)
      .values({ scenarioId: scenario.id, position: 1, action: parsed.action, expected: parsed.expected });
    return scenario;
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
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ featureId: manualScenarios.featureId })
      .from(manualScenarios)
      .where(eq(manualScenarios.id, parsed.scenarioId));
    if (!current) throw new Error(`renameManualScenario: scenario ${parsed.scenarioId} not found`);

    await assertNameAvailable(tx, {
      featureId:         current.featureId,
      name:              parsed.name,
      excludeScenarioId: parsed.scenarioId,
    });

    const [row] = await tx
      .update(manualScenarios)
      .set({ name: parsed.name, updatedAt: new Date() })
      .where(eq(manualScenarios.id, parsed.scenarioId))
      .returning();
    return row!;
  });
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

export class ManualScenarioNameTakenError extends Error {
  constructor(public readonly conflictWith: 'gherkin' | 'manual') {
    super(`manual scenario name already in use (conflicts with ${conflictWith})`);
    this.name = 'ManualScenarioNameTakenError';
  }
}

async function assertNameAvailable(
  tx: DbTx,
  input: { featureId: string; name: string; excludeScenarioId?: string },
): Promise<void> {
  const normalized = input.name.trim().toLowerCase();

  const [feature] = await tx
    .select({ content: features.content })
    .from(features)
    .where(eq(features.id, input.featureId));
  if (!feature) throw new Error(`assertNameAvailable: feature ${input.featureId} not found`);

  const gherkinNames = parse(feature.content).scenarios.map((s) => s.name.trim().toLowerCase());
  if (gherkinNames.includes(normalized)) {
    throw new ManualScenarioNameTakenError('gherkin');
  }

  const peerConds = [
    eq(manualScenarios.featureId, input.featureId),
    eq(manualScenarios.archived, false),
    sql`LOWER(TRIM(${manualScenarios.name})) = ${normalized}`,
  ];
  if (input.excludeScenarioId) peerConds.push(ne(manualScenarios.id, input.excludeScenarioId));

  const [peer] = await tx
    .select({ id: manualScenarios.id })
    .from(manualScenarios)
    .where(and(...peerConds));
  if (peer) throw new ManualScenarioNameTakenError('manual');
}

/** Return a scenario name free of gherkin and active manual collisions in the feature, suffixing as needed. */
export async function findAvailableScenarioName(tx: DbTx, featureId: string, base: string): Promise<string> {
  const [feature] = await tx.select({ content: features.content }).from(features).where(eq(features.id, featureId));
  if (!feature) throw new Error(`findAvailableScenarioName: feature ${featureId} not found`);

  const taken = new Set<string>(parse(feature.content).scenarios.map((s) => s.name.trim().toLowerCase()));
  const manual = await tx
    .select({ name: manualScenarios.name })
    .from(manualScenarios)
    .where(and(eq(manualScenarios.featureId, featureId), eq(manualScenarios.archived, false)));
  for (const row of manual) taken.add(row.name.trim().toLowerCase());

  const trimmed = base.trim();
  if (!taken.has(trimmed.toLowerCase())) return trimmed;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${trimmed} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  throw new Error(`findAvailableScenarioName: no slot under "${trimmed}"`);
}
