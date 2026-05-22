import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects } from '$lib/server/db/schema';
import { parseFeatureCode } from '$lib/shared/lib/slug';
import { TRACE_TAG_PREFIX } from '$lib/features/feature-import/lib/trace-tag';
import type { Feature } from '../match-result';

const TRACE_TAG = new RegExp(`^${TRACE_TAG_PREFIX}(.+)$`, 'i');

export function extractTraceCode(tags: string[]): string | null {
  for (const tag of tags) {
    const m = tag.match(TRACE_TAG);
    if (m && m[1]) return m[1].toLowerCase();
  }
  return null;
}

export type CodeTagResult =
  | { kind: 'matched'; feature: Feature }
  | { kind: 'no-tag' }
  | { kind: 'missing-code'; code: string };

export async function matchByCodeTag(tags: string[], projectId: string): Promise<CodeTagResult> {
  const raw = extractTraceCode(tags);
  if (raw === null) return { kind: 'no-tag' };

  const parsed = parseFeatureCode(raw);
  if (!parsed) return { kind: 'missing-code', code: raw };

  const [row] = await db
    .select({ feature: features })
    .from(features)
    .innerJoin(projects, eq(features.projectId, projects.id))
    .where(and(
      eq(features.projectId, projectId),
      eq(features.archived, false),
      eq(features.codeSeq, parsed.seq),
      eq(projects.codePrefix, parsed.prefix),
    ));

  if (!row) return { kind: 'missing-code', code: raw };
  return { kind: 'matched', feature: row.feature };
}
