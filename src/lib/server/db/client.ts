import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres   from 'postgres';
import { sql as rawSql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const MIGRATIONS_FOLDER = 'drizzle';
const MIGRATIONS_SCHEMA = 'drizzle';
const MIGRATIONS_TABLE  = '__drizzle_migrations';

const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const sql = postgres(databaseUrl, { max: 10 });

export const db = drizzle(sql, { schema });

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function countApplied(): Promise<number> {
	try {
		const rows = await db.execute<{ count: string }>(
			rawSql`select count(*)::text as count from ${rawSql.identifier(MIGRATIONS_SCHEMA)}.${rawSql.identifier(MIGRATIONS_TABLE)}`
		);
		const row = rows[0];
		return row ? Number(row.count) : 0;
	} catch {
		return 0;
	}
}

async function ensureMigrations(): Promise<void> {
	const before = await countApplied();
	await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	const after = await countApplied();
	const applied = Math.max(0, after - before);
	if (applied === 0) console.log('[db] migrations up to date');
	else console.log(`[db] migrations applied (${applied})`);
}

await ensureMigrations();
