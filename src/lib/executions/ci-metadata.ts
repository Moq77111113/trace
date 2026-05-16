import { z } from 'zod';

const trimmedShort = (max: number) =>
  z.string().trim().min(1).max(max);

/**
 * Open-ended bag of CI-supplied metadata stored on `executions.ci_metadata`.
 * Add new fields here and add the matching `X-CI-*` header in CI_HEADER_MAP —
 * no DB migration required.
 */
export const ciMetadataSchema = z
  .object({
    branch: trimmedShort(255).optional(),
    commit: trimmedShort(64).optional(),
  })
  .strict();

export type CiMetadata = z.infer<typeof ciMetadataSchema>;

/**
 * Maps lowercase ingest header names to their `CiMetadata` field. The single
 * source of truth for CI metadata wiring — extending requires one entry here,
 * one field on the Zod schema, and (optional) a CSV column in csv.ts.
 */
export const CI_HEADER_MAP: Readonly<Record<string, keyof CiMetadata>> = {
  'x-ci-branch': 'branch',
  'x-ci-commit': 'commit',
};

/**
 * Reads `CI_HEADER_MAP` headers off a Headers / lookup function, validates,
 * and returns `null` if no fields were populated (so callers store `null`
 * instead of `{}`).
 */
export function readCiMetadata(getHeader: (name: string) => string | null): CiMetadata | null {
  const raw: Record<string, string> = {};
  for (const [header, key] of Object.entries(CI_HEADER_MAP)) {
    const v = getHeader(header);
    if (v && v.trim()) raw[key] = v.trim();
  }
  if (Object.keys(raw).length === 0) return null;

  const parsed = ciMetadataSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const SHORT_COMMIT_LENGTH = 7;

export function shortCommit(commit: string | undefined): string | undefined {
  if (!commit) return undefined;
  return commit.length > SHORT_COMMIT_LENGTH ? commit.slice(0, SHORT_COMMIT_LENGTH) : commit;
}

export function formatBranchCommit(meta: CiMetadata | null | undefined): string | null {
  if (!meta) return null;
  const branch = meta.branch?.trim();
  const commit = shortCommit(meta.commit?.trim());
  if (branch && commit) return `${branch}@${commit}`;
  if (branch) return branch;
  if (commit) return commit;
  return null;
}
