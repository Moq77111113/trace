import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/create';
import { saveFeature } from '$lib/server/features/save';

const VALID_GHERKIN = `Feature: X
  Scenario: ok
    Given a
    When b
    Then c
`;

describe('saveFeature with description', () => {
  it('saves description only and bumps version', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const r = await saveFeature({
      featureId:       f.id,
      content:         null,
      description:     'Cas nominal: création POI valide.',
      expectedVersion: f.version,
      editor:          'alice',
    });
    expect(r.conflict).toBe(false);
    if (r.conflict) throw new Error('expected non-conflict result');
    expect(r.feature.version).toBe(f.version + 1);
    expect(r.feature.description).toBe('Cas nominal: création POI valide.');
    expect(r.feature.content).toBeNull();
    expect(r.feature.parseErrors).toBeNull();
  });

  it('saves both content and description in one call', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const r = await saveFeature({
      featureId:       f.id,
      content:         VALID_GHERKIN,
      description:     'spec libre',
      expectedVersion: f.version,
      editor:          'alice',
    });
    expect(r.conflict).toBe(false);
    if (r.conflict) throw new Error('expected non-conflict result');
    expect(r.feature.content).toBe(VALID_GHERKIN);
    expect(r.feature.description).toBe('spec libre');
  });

  it('clearing content to null is allowed', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const r1 = await saveFeature({
      featureId:       f.id,
      content:         VALID_GHERKIN,
      description:     null,
      expectedVersion: f.version,
      editor:          'alice',
    });
    if (r1.conflict) throw new Error('expected non-conflict r1');
    const r2 = await saveFeature({
      featureId:       f.id,
      content:         null,
      description:     null,
      expectedVersion: r1.feature.version,
      editor:          'alice',
    });
    if (r2.conflict) throw new Error('expected non-conflict r2');
    const [row] = await db.select().from(features).where(eq(features.id, f.id));
    expect(row?.content).toBeNull();
    expect(r2.feature.version).toBe(r1.feature.version + 1);
  });
});
