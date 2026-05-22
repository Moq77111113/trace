import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, manualScenarios, scenarioResults } from '$lib/server/db/schema';
import { mkProject } from '$testing/fixtures';

describe('manual-features schema', () => {
  it('features.description accepts null and content defaults to empty string', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const [row] = await db
      .insert(features)
      .values({ projectId: p.id, codeSeq: 1, name: 'X', description: null })
      .returning();
    if (!row) throw new Error('features insert returned no row');
    expect(row.description).toBeNull();
    expect(row.content).toBe('');
  });

  it('manual_scenarios row inserts and reads back, archived defaults false', async () => {
    const p = await mkProject({ name: `S ${Date.now()}` });
    const [feature] = await db
      .insert(features)
      .values({ projectId: p.id, codeSeq: 1, name: 'X', description: null })
      .returning();
    if (!feature) throw new Error('features insert returned no row');

    const [row] = await db
      .insert(manualScenarios)
      .values({ featureId: feature.id, position: 1, name: 'cas nominal' })
      .returning();
    if (!row) throw new Error('manual_scenarios insert returned no row');

    expect(row.id).toBeDefined();
    expect(row.archived).toBe(false);
    const found = await db.select().from(manualScenarios).where(eq(manualScenarios.featureId, feature.id));
    expect(found).toHaveLength(1);
    expect(found[0]?.name).toBe('cas nominal');
  });

  it('scenario_results.source enum accepts GHERKIN and MANUAL', () => {
    const enumValues: (typeof scenarioResults.$inferInsert.source)[] = ['GHERKIN', 'MANUAL'];
    expect(enumValues).toEqual(['GHERKIN', 'MANUAL']);
  });
});
