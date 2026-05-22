import { describe, it, expect } from 'vitest';
import {
  addManualScenario,
  archiveManualScenario,
  renameManualScenario,
  ManualScenarioNameTakenError,
} from '$lib/server/features/manual-scenarios';
import { mkFeature, mkProject } from '$testing/fixtures';

async function freshFeature(content = 'Feature: F\n') {
  const project = await mkProject({ name: `Manual ${Date.now()}-${Math.random()}` });
  const feature = await mkFeature(project.id, { name: 'F', content });
  return { project, feature };
}

describe('addManualScenario name guard', () => {
  it('rejects a name that matches another active manual scenario (case-insensitive)', async () => {
    const { feature } = await freshFeature();
    await addManualScenario({ featureId: feature.id, name: 'Visual check' });

    await expect(
      addManualScenario({ featureId: feature.id, name: 'visual CHECK' }),
    ).rejects.toBeInstanceOf(ManualScenarioNameTakenError);
  });

  it('rejects a name that matches a parsed Gherkin scenario in the same feature', async () => {
    const { feature } = await freshFeature('Feature: F\n\n  Scenario: Sign in succeeds\n');

    await expect(
      addManualScenario({ featureId: feature.id, name: 'sign in succeeds' }),
    ).rejects.toBeInstanceOf(ManualScenarioNameTakenError);
  });

  it('exposes which side caused the collision via the conflictWith field', async () => {
    const { feature } = await freshFeature('Feature: F\n\n  Scenario: Login\n');
    let caught: ManualScenarioNameTakenError | null = null;
    try {
      await addManualScenario({ featureId: feature.id, name: 'Login' });
    } catch (e) {
      caught = e as ManualScenarioNameTakenError;
    }
    expect(caught?.conflictWith).toBe('gherkin');
  });

  it('allows the same name once the conflicting manual scenario is archived', async () => {
    const { feature } = await freshFeature();
    const first = await addManualScenario({ featureId: feature.id, name: 'Visual check' });
    await archiveManualScenario({ scenarioId: first.id });

    const second = await addManualScenario({ featureId: feature.id, name: 'Visual check' });
    expect(second.id).not.toBe(first.id);
  });
});

describe('renameManualScenario name guard', () => {
  it('rejects renaming to another active manual scenario name', async () => {
    const { feature } = await freshFeature();
    const a = await addManualScenario({ featureId: feature.id, name: 'Visual check A' });
    await addManualScenario({ featureId: feature.id, name: 'Visual check B' });

    await expect(
      renameManualScenario({ scenarioId: a.id, name: 'Visual check B' }),
    ).rejects.toBeInstanceOf(ManualScenarioNameTakenError);
  });

  it('rejects renaming to a Gherkin scenario name in the same feature', async () => {
    const { feature } = await freshFeature('Feature: F\n\n  Scenario: Login\n');
    const a = await addManualScenario({ featureId: feature.id, name: 'Visual check' });

    await expect(
      renameManualScenario({ scenarioId: a.id, name: 'login' }),
    ).rejects.toBeInstanceOf(ManualScenarioNameTakenError);
  });

  it('allows renaming to the same name (no-op)', async () => {
    const { feature } = await freshFeature();
    const a = await addManualScenario({ featureId: feature.id, name: 'Visual check' });

    const updated = await renameManualScenario({ scenarioId: a.id, name: 'Visual check' });
    expect(updated.name).toBe('Visual check');
  });

  it('allows renaming to a name held by an archived sibling', async () => {
    const { feature } = await freshFeature();
    const archived = await addManualScenario({ featureId: feature.id, name: 'Old name' });
    await archiveManualScenario({ scenarioId: archived.id });

    const current = await addManualScenario({ featureId: feature.id, name: 'Current name' });
    const renamed = await renameManualScenario({ scenarioId: current.id, name: 'Old name' });
    expect(renamed.name).toBe('Old name');
  });
});
