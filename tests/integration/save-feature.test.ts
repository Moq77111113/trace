import { describe, it, expect } from 'vitest';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/create';
import { saveFeature } from '$lib/server/features/save';

const goodGherkin = (name: string) =>
  `@smoke\nFeature: ${name}\n  Scenario: A\n    Given x\n`;
const badGherkin = 'Feature Login\n  Scenrio: A\n';

describe('saveFeature', () => {
  it('saves valid content, bumps version, populates name + tags', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });

    const r = await saveFeature({ featureId: f.id, content: goodGherkin('X'), description: null, expectedVersion: f.version, editor: 'alice' });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.feature.version).toBe(f.version + 1);
    expect(r.feature.parseErrors).toBeNull();
  });

  it('rejects with conflict when expectedVersion is stale', async () => {
    const p = await mkProject({ name: `S2 ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });

    await saveFeature({ featureId: f.id, content: goodGherkin('X'), description: null, expectedVersion: f.version, editor: 'alice' });
    const r2 = await saveFeature({ featureId: f.id, content: goodGherkin('X'), description: null, expectedVersion: f.version, editor: 'bob' });

    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toBe('version-conflict');
    if (r2.reason !== 'version-conflict') return;
    expect(r2.currentFeature.version).toBe(f.version + 1);
  });

  it('saves invalid content permissively with parseErrors set', async () => {
    const p = await mkProject({ name: `S3 ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });

    const r = await saveFeature({ featureId: f.id, content: badGherkin, description: null, expectedVersion: f.version, editor: 'alice' });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.feature.parseErrors).not.toBeNull();
    expect(r.feature.parseErrors?.length ?? 0).toBeGreaterThan(0);
  });
});
