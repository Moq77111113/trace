import { uuid } from 'drizzle-orm/pg-core';
import { sql }  from 'drizzle-orm';

/**
 * Standard primary-key column.
 * Uses Postgres 18 native `uuidv7()` for time-ordered UUIDs.
 * Encodes one decision: all PKs are UUIDv7.
 */
export const pk = () => uuid('id').primaryKey().default(sql`uuidv7()`);
