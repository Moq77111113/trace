import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, manualScenarios } from '$lib/server/db/schema';
import { parse } from '$lib/shared/gherkin/parse';
import type { ExistingCorpus } from '$lib/shared/import-manual/collisions';

/** Build the existing-name corpus for a project: per active feature, its gherkin + active manual scenario names. */
export async function existingCorpus(projectId: string): Promise<ExistingCorpus> {
  const rows = await db
    .select({ name: features.name, content: features.content, id: features.id })
    .from(features)
    .where(and(eq(features.projectId, projectId), eq(features.archived, false)));

  const corpus: ExistingCorpus = new Map();

  for (const row of rows) {
    const names = new Set<string>(parse(row.content).scenarios.map((s) => s.name.trim().toLowerCase()));
    const manual = await db
      .select({ name: manualScenarios.name })
      .from(manualScenarios)
      .where(and(eq(manualScenarios.featureId, row.id), eq(manualScenarios.archived, false)));
    for (const m of manual) names.add(m.name.trim().toLowerCase());
    corpus.set(row.name.trim().toLowerCase(), names);
  }

  return corpus;
}
