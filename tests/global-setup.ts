import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

let container: StartedPostgreSqlContainer | null = null;

export async function setup({ provide }: TestProject): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18-alpine')
    .withUsername('trace')
    .withPassword('trace')
    .withDatabase('trace')
    .start();

  const url = container.getConnectionUri();

  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
  } finally {
    await sql.end();
  }

  provide('databaseUrl', url);
}

export async function teardown(): Promise<void> {
  await container?.stop();
  container = null;
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
