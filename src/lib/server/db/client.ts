import { drizzle } from 'drizzle-orm/postgres-js';
import postgres   from 'postgres';
import { env }    from '$env/dynamic/private';
import * as schema from './schema';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const sql = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(sql, { schema });

/**
 * Transaction handle exposed by `db.transaction()`. Use this type when a
 * server function requires the caller to provide a transaction — encodes
 * "this operation only runs inside a caller-managed atomic scope".
 */
export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
