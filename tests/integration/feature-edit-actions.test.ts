import { describe, expect, it } from 'vitest';
import { mkProject } from '$testing/fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';
import {
  addManualScenario,
  archiveManualScenario,
  listManualScenarios,
  renameManualScenario,
  reorderManualScenarios,
} from '$lib/server/features/manual-scenarios';

describe('manual scenarios — domain ops', () => {
  it('addManualScenario appends a row', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const row = await addManualScenario({ featureId: f.id, name: 'cas nominal' });
    expect(row.name).toBe('cas nominal');
    const list = await listManualScenarios({ featureId: f.id });
    expect(list).toHaveLength(1);
  });

  it('renameManualScenario updates the row', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const added   = await addManualScenario({ featureId: f.id, name: 'old' });
    const renamed = await renameManualScenario({ scenarioId: added.id, name: 'new' });
    expect(renamed.name).toBe('new');
  });

  it('archiveManualScenario hides the row', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenario({ featureId: f.id, name: 'gone' });
    await archiveManualScenario({ scenarioId: a.id });
    const list = await listManualScenarios({ featureId: f.id });
    expect(list).toHaveLength(0);
  });

  it('reorderManualScenarios applies the new order', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenario({ featureId: f.id, name: 'A' });
    const b = await addManualScenario({ featureId: f.id, name: 'B' });
    await reorderManualScenarios({ featureId: f.id, order: [b.id, a.id] });
    const list = await listManualScenarios({ featureId: f.id });
    expect(list.map((r) => r.name)).toEqual(['B', 'A']);
  });
});
