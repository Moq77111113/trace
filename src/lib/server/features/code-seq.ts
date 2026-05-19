import { eq, sql } from 'drizzle-orm';
import { features } from '$lib/server/db/schema';
import type { DbTx } from '$lib/server/db/client';

/**
 * Allocate the next `code_seq` for a project, inside the caller's transaction.
 * Takes a per-project transaction-scoped advisory lock so concurrent allocations
 * serialize cleanly — the unique index on (project_id, code_seq) is the safety net.
 */
export async function allocateCodeSeq(tx: DbTx, projectId: string): Promise<number> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('feature_code_seq'), hashtext(${projectId}))`);

  const [row] = await tx
    .select({ max: sql<number | null>`COALESCE(MAX(${features.codeSeq}), 0)` })
    .from(features)
    .where(eq(features.projectId, projectId));

  return Number(row?.max ?? 0) + 1;
}
