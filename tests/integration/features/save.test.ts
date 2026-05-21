import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { saveFeature } from '$lib/server/features/save';
import { addManualScenario } from '$lib/server/features/manual-scenarios';
import { mkFeature, mkProject } from '../../fixtures';

async function freshFeature(content = 'Feature: F\n') {
  const project = await mkProject({ name: `Save ${Date.now()}-${Math.random()}` });
  const feature = await mkFeature(project.id, { name: 'F', content });
  return { project, feature };
}

describe('saveFeature manual-name collision guard', () => {
  it('rejects Gherkin content whose scenario name matches an active manual scenario', async () => {
    const { feature } = await freshFeature('Feature: F\n');
    await addManualScenario({ featureId: feature.id, name: 'Visual check' });

    const result = await saveFeature({
      featureId:       feature.id,
      content:         'Feature: F\n\n  Scenario: visual check\n',
      description:     null,
      expectedVersion: feature.version,
      editor:          'Alice',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('manual-name-collision');
    if (result.reason !== 'manual-name-collision') return;
    expect(result.collisions.map((c) => c.toLowerCase())).toContain('visual check');

    const [reloaded] = await db.select().from(features).where(eq(features.id, feature.id));
    if (!reloaded) throw new Error('reloaded feature missing');
    expect(reloaded.version).toBe(feature.version);
  });

  it('returns ok when the new Gherkin content does not collide', async () => {
    const { feature } = await freshFeature('Feature: F\n');
    await addManualScenario({ featureId: feature.id, name: 'Visual check' });

    const result = await saveFeature({
      featureId:       feature.id,
      content:         'Feature: F\n\n  Scenario: Login\n',
      description:     null,
      expectedVersion: feature.version,
      editor:          'Alice',
    });

    expect(result.ok).toBe(true);
  });

  it('signals version-conflict when expectedVersion is stale', async () => {
    const { feature } = await freshFeature();
    const result = await saveFeature({
      featureId:       feature.id,
      content:         'Feature: F\n\n  Scenario: A\n',
      description:     null,
      expectedVersion: feature.version + 5,
      editor:          'Alice',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('version-conflict');
  });
});
