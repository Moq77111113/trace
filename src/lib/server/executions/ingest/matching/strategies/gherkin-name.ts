import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import type { Feature } from '../match-result';

const FEATURE_LINE = /^[ \t]*Feature:[ \t]*(.+?)[ \t]*$/m;

export function extractGherkinFeatureName(content: string): string | null {
  const m = content.match(FEATURE_LINE);
  return m?.[1] ?? null;
}

export async function matchByGherkinName(featureName: string, projectId: string): Promise<Feature | null> {
  const rows = await db
    .select()
    .from(features)
    .where(and(
      eq(features.projectId, projectId),
      eq(features.archived, false),
    ));

  const needle = featureName.toLowerCase();
  for (const row of rows) {
    const gherkinName = extractGherkinFeatureName(row.content);
    if (gherkinName && gherkinName.toLowerCase() === needle) return row;
  }
  return null;
}
