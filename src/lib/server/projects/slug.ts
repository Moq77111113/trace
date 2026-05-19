import { eq } from 'drizzle-orm';
import { db, type DbTx } from '$lib/server/db/client';
import { projects } from '$lib/server/db/schema';
import { kebab } from '$lib/shared/lib/slug';

const MAX_ATTEMPTS = 100;

/**
 * Find a free slug under `base`. Tries `base`, then `base-2`, `base-3`, … up to MAX_ATTEMPTS.
 * Throws if no slot is available — practically unreachable, but surfaces a hard failure rather
 * than colliding on insert.
 */
export async function nextAvailableSlug(base: string, tx: DbTx | typeof db = db): Promise<string> {
  const candidates: string[] = [base];
  for (let n = 2; n <= MAX_ATTEMPTS; n += 1) candidates.push(`${base}-${n}`);

  for (const candidate of candidates) {
    const existing = await tx.query.projects.findFirst({ where: eq(projects.slug, candidate) });
    if (!existing) return candidate;
  }
  throw new Error(`nextAvailableSlug: no slot under "${base}" after ${MAX_ATTEMPTS} attempts`);
}

/** Convenience: derive a kebab base from a name and resolve to a free slug in one call. */
export function nextAvailableSlugForName(name: string, tx?: DbTx | typeof db): Promise<string> {
  return nextAvailableSlug(kebab(name), tx);
}
