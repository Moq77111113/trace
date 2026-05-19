import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql as rawSql } from 'drizzle-orm';
import { building } from '$app/environment';
import { requireEnv } from '$lib/server/config/env';
import * as schema from './schema';

const MIGRATIONS_FOLDER = 'drizzle';
const MIGRATIONS_SCHEMA = 'drizzle';
const MIGRATIONS_TABLE  = '__drizzle_migrations';

type Drizzle = ReturnType<typeof drizzle<typeof schema>>;

let cached: Drizzle | null = null;

function init(): Drizzle {
	const sql = postgres(requireEnv('DATABASE_URL'), {
		max: 10,
		onnotice: (notice) => {
			if (notice.severity !== 'NOTICE') console.warn(notice);
		}
	});
	return drizzle(sql, { schema });
}

function getDb(): Drizzle {
	return (cached ??= init());
}

export const db = new Proxy({} as Drizzle, {
	get(_target, prop, receiver) {
		const inst = getDb();
		const value = Reflect.get(inst, prop, receiver);
		return typeof value === 'function' ? value.bind(inst) : value;
	}
});

export type DbTx = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

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
	await migrate(getDb(), { migrationsFolder: MIGRATIONS_FOLDER });
	const after = await countApplied();
	const applied = Math.max(0, after - before);
	if (applied === 0) console.log('[db] migrations up to date');
	else console.log(`[db] migrations applied (${applied})`);
}

if (!building) await ensureMigrations();
