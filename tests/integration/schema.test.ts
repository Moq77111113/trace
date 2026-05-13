import { describe, it, expect } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres   from 'postgres';
import { eq }     from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db  = drizzle(sql, { schema });

describe('schema', () => {
  it('inserts a project and retrieves it', async () => {
    const [created] = await db.insert(schema.projects)
      .values({ name: `Test ${Date.now()}` })
      .returning();

    const found = await db.query.projects.findFirst({ where: eq(schema.projects.id, created.id) });

    expect(found?.id).toBe(created.id);
    expect(found?.archived).toBe(false);
  });

  it('enforces unique feature name per project (case insensitive)', async () => {
    const [p] = await db.insert(schema.projects)
      .values({ name: `P ${Date.now()}` })
      .returning();

    await db.insert(schema.features).values({ projectId: p.id, name: 'Login', content: 'Feature: Login' });

    await expect(
      db.insert(schema.features).values({ projectId: p.id, name: 'LOGIN', content: 'Feature: LOGIN' }),
    ).rejects.toThrow();
  });
});
