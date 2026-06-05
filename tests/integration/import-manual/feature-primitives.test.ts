import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { findOrCreateFeature } from '$lib/server/features/import-create';
import { findAvailableScenarioName, appendManualScenario, addManualScenario } from '$lib/server/features/manual-scenarios';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('findOrCreateFeature', () => {
  it('returns the existing feature id for a case-insensitive name match', async () => {
    const project = await mkProject({ name: `FOC ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, { name: 'Catalog', content: 'Feature: Catalog\n' });
    const id = await db.transaction((tx) => findOrCreateFeature(tx, project.id, 'catalog'));
    expect(id).toBe(feature.id);
  });

  it('creates a new empty-content feature when none matches', async () => {
    const project = await mkProject({ name: `FOC ${Date.now()}-${Math.random()}` });
    const id = await db.transaction((tx) => findOrCreateFeature(tx, project.id, 'Brand new'));
    const row = await db.query.features.findFirst({ where: (f, { eq }) => eq(f.id, id) });
    expect(row?.name).toBe('Brand new');
    expect(row?.content).toBe('');
  });
});

describe('findAvailableScenarioName', () => {
  it('suffixes the name when it already exists in the feature', async () => {
    const project = await mkProject({ name: `FAS ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, { name: 'F', content: 'Feature: F\n' });
    await addManualScenario({ featureId: feature.id, name: 'Login' });
    const name = await db.transaction((tx) => findAvailableScenarioName(tx, feature.id, 'Login'));
    expect(name).toBe('Login (2)');
  });
});
