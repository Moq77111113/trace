import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

let container: StartedPostgreSqlContainer | null = null;

export async function setup(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18-alpine')
    .withUsername('trace')
    .withPassword('trace')
    .withDatabase('trace')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  const sql = postgres(container.getConnectionUri(), { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
  } finally {
    await sql.end();
  }
}

export async function teardown(): Promise<void> {
  await container?.stop();
  container = null;
}
