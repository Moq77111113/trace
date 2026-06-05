import { describe, it, expect } from 'vitest';
import { existingCorpus } from '$lib/server/import/manual/existing';
import { addManualScenario } from '$lib/server/features/manual-scenarios';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('existingCorpus', () => {
  it('collects manual and gherkin scenario names keyed by lowercased feature name', async () => {
    const project = await mkProject({ name: `Existing ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, { name: 'Catalog', content: 'Feature: Catalog\n\n  Scenario: Login works\n' });
    await addManualScenario({ featureId: feature.id, name: 'Search returns results' });

    const corpus = await existingCorpus(project.id);
    const names = corpus.get('catalog');
    expect(names?.has('search returns results')).toBe(true);
    expect(names?.has('login works')).toBe(true);
  });

  it('includes active features in the corpus', async () => {
    const project = await mkProject({ name: `Existing ${Date.now()}-${Math.random()}` });
    await mkFeature(project.id, { name: 'Live', content: 'Feature: Live\n' });

    const corpus = await existingCorpus(project.id);
    expect(corpus.has('live')).toBe(true);
  });
});
