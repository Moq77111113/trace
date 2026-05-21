import { describe, expect, it } from 'vitest';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';
import {
  addManualScenarioAction,
  renameManualScenarioAction,
  archiveManualScenarioAction,
  reorderManualScenariosAction,
} from '$lib/server/features/lifecycle/edit';
import { listManualScenarios } from '$lib/server/features/manual-scenarios';

describe('feature edit page — manual scenario form actions', () => {
  it('addManualScenarioAction appends a row', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const res = await addManualScenarioAction({ featureId: f.id, name: 'cas nominal' });
    expect(res.scenario.name).toBe('cas nominal');
    const list = await listManualScenarios({ featureId: f.id });
    expect(list).toHaveLength(1);
  });

  it('renameManualScenarioAction updates the row', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const added = await addManualScenarioAction({ featureId: f.id, name: 'old' });
    const renamed = await renameManualScenarioAction({ scenarioId: added.scenario.id, name: 'new' });
    expect(renamed.scenario.name).toBe('new');
  });

  it('archiveManualScenarioAction hides the row', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenarioAction({ featureId: f.id, name: 'gone' });
    await archiveManualScenarioAction({ scenarioId: a.scenario.id });
    const list = await listManualScenarios({ featureId: f.id });
    expect(list).toHaveLength(0);
  });

  it('reorderManualScenariosAction applies the new order', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const a = await addManualScenarioAction({ featureId: f.id, name: 'A' });
    const b = await addManualScenarioAction({ featureId: f.id, name: 'B' });
    await reorderManualScenariosAction({ featureId: f.id, order: [b.scenario.id, a.scenario.id] });
    const list = await listManualScenarios({ featureId: f.id });
    expect(list.map((r) => r.name)).toEqual(['B', 'A']);
  });
});
