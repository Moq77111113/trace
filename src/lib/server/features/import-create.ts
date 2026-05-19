import { and, eq, sql } from 'drizzle-orm';
import { featureGroups, features } from '$lib/server/db/schema';
import type { DbTx } from '$lib/server/db/client';
import { parse } from '$lib/shared/gherkin/parse';
import { allocateCodeSeq } from './code-seq';
import { syncFeatureTags } from './tags-sync';

type Input = {
  projectId: string;
  content:   string;
  /** When set, overrides the parsed Feature: name and rewrites the Feature: line in content. */
  renameTo?:  string;
  /** When set, find-or-create a group with this name and link the feature to it. */
  groupName?: string | null;
};

const FEATURE_LINE = /^[ \t]*Feature:\s*.+$/m;

export async function importFeatureFromContent(tx: DbTx, input: Input): Promise<{ id: string; name: string; groupId: string | null }> {
  const content = input.renameTo
    ? input.content.replace(FEATURE_LINE, `Feature: ${input.renameTo}`)
    : input.content;

  const parsed = parse(content);
  const name   = input.renameTo ?? parsed.name?.trim() ?? '(unnamed)';
  const errors = parsed.errors.length > 0 ? parsed.errors : null;

  const groupId = input.groupName
    ? await findOrCreateGroup(tx, input.projectId, input.groupName)
    : null;

  const codeSeq = await allocateCodeSeq(tx, input.projectId);

  const [row] = await tx.insert(features)
    .values({ projectId: input.projectId, name, content, parseErrors: errors, groupId, codeSeq })
    .returning({ id: features.id, name: features.name, groupId: features.groupId });

  if (!row) throw new Error('importFeatureFromContent: insert returned no row');

  await syncFeatureTags(tx, { projectId: input.projectId, featureId: row.id, parsedTags: parsed.tags });

  return row;
}

export async function findOrCreateGroup(tx: DbTx, projectId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('findOrCreateGroup: empty name');

  const existing = await tx.query.featureGroups.findFirst({
    where: and(
      eq(featureGroups.projectId, projectId),
      sql`LOWER(${featureGroups.name}) = LOWER(${trimmed})`,
    ),
  });
  if (existing) return existing.id;

  const [created] = await tx.insert(featureGroups)
    .values({
      projectId,
      name:     trimmed,
      position: sql<number>`COALESCE((SELECT MAX(position) FROM ${featureGroups} WHERE project_id = ${projectId}), -1) + 1`,
    })
    .returning({ id: featureGroups.id });

  if (!created) throw new Error('findOrCreateGroup: insert returned no row');
  return created.id;
}

export async function findAvailableName(tx: DbTx, projectId: string, base: string): Promise<string> {
  const taken = await tx.select({ name: features.name })
    .from(features)
    .where(and(
      eq(features.projectId, projectId),
      eq(features.archived, false),
      sql`LOWER(${features.name}) LIKE LOWER(${`${base}%`})`,
    ));

  const lowered = new Set(taken.map((r) => r.name.toLowerCase()));

  if (!lowered.has(base.toLowerCase())) return base;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base} (${n})`;
    if (!lowered.has(candidate.toLowerCase())) return candidate;
  }

  throw new Error(`findAvailableName: no slot under "${base}"`);
}
