const UNIQUE_VIOLATION = '23505';

type PgError = {
  code:            string;
  constraint_name?: string;
  table_name?:      string;
  message:         string;
};

function unwrap(e: unknown): PgError | null {
  if (!e || typeof e !== 'object') return null;
  const target = 'cause' in e && e.cause ? e.cause : e;
  if (!target || typeof target !== 'object') return null;
  if (!('code' in target) || typeof (target as PgError).code !== 'string') return null;
  return target as PgError;
}

/**
 * Match a unique-constraint violation, optionally narrowed by constraint name.
 * Use this in the catch arm of an insert when a duplicate is a domain outcome
 * (`return { error: 'taken' }`) rather than a bug.
 */
export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  const pg = unwrap(e);
  if (!pg || pg.code !== UNIQUE_VIOLATION) return false;
  return constraint ? pg.constraint_name === constraint : true;
}
