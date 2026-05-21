import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';
import { saveFeature } from '$lib/server/features/lifecycle/save';

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
      content:         '',
      description:     'Cas nominal: création POI valide.',
      expectedVersion: f.version,
      editor:          'alice',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.feature.version).toBe(f.version + 1);
    expect(r.feature.description).toBe('Cas nominal: création POI valide.');
    expect(r.feature.content).toBe('');
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
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.feature.content).toBe(VALID_GHERKIN);
    expect(r.feature.description).toBe('spec libre');
  });

  it('clearing content to empty string is allowed', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'X' });
    const r1 = await saveFeature({
      featureId:       f.id,
      content:         VALID_GHERKIN,
      description:     null,
      expectedVersion: f.version,
      editor:          'alice',
    });
    if (!r1.ok) throw new Error('setup: first save unexpectedly failed');
    const r2 = await saveFeature({
      featureId:       f.id,
      content:         '',
      description:     null,
      expectedVersion: r1.feature.version,
      editor:          'alice',
    });
    if (!r2.ok) throw new Error('setup: second save unexpectedly failed');
    const [row] = await db.select().from(features).where(eq(features.id, f.id));
    expect(row?.content).toBe('');
    expect(r2.feature.version).toBe(r1.feature.version + 1);
  });
});
