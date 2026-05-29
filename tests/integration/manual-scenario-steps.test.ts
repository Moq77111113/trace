import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { manualScenarios, manualScenarioSteps } from '$lib/server/db/schema';
import { mkFeature, mkProject } from '$testing/fixtures';
import { addManualScenario } from '$lib/server/features/manual-scenarios';
import {
  addStep,
  editStep,
  listSteps,
  removeStep,
  reorderSteps,
} from '$lib/server/features/manual-scenario-steps';

async function freshScenario() {
  const project  = await mkProject({ name: `Steps ${Date.now()}-${Math.random()}` });
  const feature  = await mkFeature(project.id, { name: 'F', content: 'Feature: F\n' });
  const scenario = await addManualScenario({ featureId: feature.id, name: 'Visual check' });
  return { feature, scenario };
}

describe('manual scenario steps CRUD', () => {
  it('addStep appends with the next position', async () => {
    const { scenario } = await freshScenario();
    const a = await addStep({ scenarioId: scenario.id, action: 'open the page' });
    const b = await addStep({ scenarioId: scenario.id, action: 'click submit' });
    expect(a.position).toBe(1);
    expect(b.position).toBe(2);
  });

  it('addStep keeps expected null when omitted and stores it when present', async () => {
    const { scenario } = await freshScenario();
    const setup  = await addStep({ scenarioId: scenario.id, action: 'open the page' });
    const assert = await addStep({ scenarioId: scenario.id, action: 'click submit', expected: 'a toast shows' });
    expect(setup.expected).toBeNull();
    expect(assert.expected).toBe('a toast shows');
  });

  it('addStep trims an empty expected down to null', async () => {
    const { scenario } = await freshScenario();
    const step = await addStep({ scenarioId: scenario.id, action: 'open', expected: '   ' });
    expect(step.expected).toBeNull();
  });

  it('addStep rejects a blank action', async () => {
    const { scenario } = await freshScenario();
    await expect(addStep({ scenarioId: scenario.id, action: '   ' })).rejects.toThrow();
  });

  it('addStep rejects an action longer than the cap', async () => {
    const { scenario } = await freshScenario();
    await expect(addStep({ scenarioId: scenario.id, action: 'x'.repeat(2001) })).rejects.toThrow();
  });

  it('listSteps returns rows in position order', async () => {
    const { scenario } = await freshScenario();
    await addStep({ scenarioId: scenario.id, action: 'one' });
    await addStep({ scenarioId: scenario.id, action: 'two' });
    const rows = await listSteps({ scenarioId: scenario.id });
    expect(rows.map((r) => r.action)).toEqual(['one', 'two']);
  });

  it('editStep updates both action and expected together', async () => {
    const { scenario } = await freshScenario();
    const step = await addStep({ scenarioId: scenario.id, action: 'old', expected: 'old result' });
    const updated = await editStep({ stepId: step.id, action: 'new', expected: 'new result' });
    expect(updated.action).toBe('new');
    expect(updated.expected).toBe('new result');
  });

  it('editStep can clear expected back to null', async () => {
    const { scenario } = await freshScenario();
    const step = await addStep({ scenarioId: scenario.id, action: 'a', expected: 'b' });
    const updated = await editStep({ stepId: step.id, action: 'a' });
    expect(updated.expected).toBeNull();
  });

  it('removeStep hard-deletes the row', async () => {
    const { scenario } = await freshScenario();
    const step = await addStep({ scenarioId: scenario.id, action: 'gone' });
    await removeStep({ stepId: step.id });
    const rows = await listSteps({ scenarioId: scenario.id });
    expect(rows).toHaveLength(0);
  });

  it('reorderSteps applies a permutation and keeps positions contiguous from 1', async () => {
    const { scenario } = await freshScenario();
    const a = await addStep({ scenarioId: scenario.id, action: 'A' });
    const b = await addStep({ scenarioId: scenario.id, action: 'B' });
    const c = await addStep({ scenarioId: scenario.id, action: 'C' });
    await reorderSteps({ scenarioId: scenario.id, order: [c.id, a.id, b.id] });
    const rows = await listSteps({ scenarioId: scenario.id });
    expect(rows.map((r) => r.action)).toEqual(['C', 'A', 'B']);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it('reorderSteps rejects an order set that does not match the scenario steps', async () => {
    const { scenario } = await freshScenario();
    const a = await addStep({ scenarioId: scenario.id, action: 'A' });
    await addStep({ scenarioId: scenario.id, action: 'B' });
    await expect(reorderSteps({ scenarioId: scenario.id, order: [a.id] })).rejects.toThrow(/order/i);
  });

  it('steps cascade-delete when the parent scenario is deleted', async () => {
    const { scenario } = await freshScenario();
    await addStep({ scenarioId: scenario.id, action: 'will cascade' });
    await db.delete(manualScenarios).where(eq(manualScenarios.id, scenario.id));
    const rows = await db.select().from(manualScenarioSteps).where(eq(manualScenarioSteps.scenarioId, scenario.id));
    expect(rows).toHaveLength(0);
  });
});
