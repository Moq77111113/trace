import { drizzle } from 'drizzle-orm/postgres-js';
import postgres   from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const sql = postgres(databaseUrl, { max: 10 });

export const db = drizzle(sql, { schema });

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
