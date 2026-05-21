import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { manualScenarios } from '$lib/server/db/schema';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';
import {
  addManualScenario,
  listManualScenarios,
  renameManualScenario,
  reorderManualScenarios,
  archiveManualScenario,
} from '$lib/server/features/manual-scenarios';

describe('manual scenarios CRUD', () => {
  it('addManualScenario appends with the next position', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenario({ featureId: f.id, name: 'cas nominal' });
    const b = await addManualScenario({ featureId: f.id, name: 'cas failure' });
    expect(a.position).toBe(1);
    expect(b.position).toBe(2);
  });

  it('listManualScenarios returns active rows in position order', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    await addManualScenario({ featureId: f.id, name: 'one' });
    const b = await addManualScenario({ featureId: f.id, name: 'two' });
    await archiveManualScenario({ scenarioId: b.id });
    const rows = await listManualScenarios({ featureId: f.id });
    expect(rows.map((r) => r.name)).toEqual(['one']);
  });

  it('renameManualScenario updates name and bumps updatedAt', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenario({ featureId: f.id, name: 'old' });
    const before = a.updatedAt;
    const renamed = await renameManualScenario({ scenarioId: a.id, name: 'new' });
    expect(renamed.name).toBe('new');
    expect(renamed.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('reorderManualScenarios applies a permutation atomically', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenario({ featureId: f.id, name: 'A' });
    const b = await addManualScenario({ featureId: f.id, name: 'B' });
    const c = await addManualScenario({ featureId: f.id, name: 'C' });
    await reorderManualScenarios({ featureId: f.id, order: [c.id, a.id, b.id] });
    const rows = await listManualScenarios({ featureId: f.id });
    expect(rows.map((r) => r.name)).toEqual(['C', 'A', 'B']);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it('reorderManualScenarios rejects an order set that does not match active rows', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenario({ featureId: f.id, name: 'A' });
    await addManualScenario({ featureId: f.id, name: 'B' });
    await expect(
      reorderManualScenarios({ featureId: f.id, order: [a.id] }),
    ).rejects.toThrow(/order/i);
  });

  it('archiveManualScenario keeps the row but hides it from listManualScenarios', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenario({ featureId: f.id, name: 'gone' });
    await archiveManualScenario({ scenarioId: a.id });
    const active = await listManualScenarios({ featureId: f.id });
    expect(active).toHaveLength(0);
    const [row] = await db.select().from(manualScenarios).where(eq(manualScenarios.id, a.id));
    if (!row) throw new Error('manual_scenarios row not found');
    expect(row.archived).toBe(true);
  });
});
