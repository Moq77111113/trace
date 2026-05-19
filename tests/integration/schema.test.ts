import { describe, it, expect } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres   from 'postgres';
import { eq }     from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db  = drizzle(sql, { schema });

describe('schema', () => {
  it('inserts a project and retrieves it', async () => {
    const stamp = Date.now().toString(36);
    const inserted = await db.insert(schema.projects)
      .values({ name: `Test ${stamp}`, slug: `test-${stamp}`, codePrefix: `t${stamp.slice(-4)}` })
      .returning();

    expect(inserted).toHaveLength(1);
    const created = inserted[0]!;

    const found = await db.query.projects.findFirst({ where: eq(schema.projects.id, created.id) });

    expect(found?.id).toBe(created.id);
    expect(found?.archived).toBe(false);
  });

  it('enforces unique feature name per project (case insensitive)', async () => {
    const stamp = Date.now().toString(36);
    const inserted = await db.insert(schema.projects)
      .values({ name: `P ${stamp}`, slug: `p-${stamp}`, codePrefix: `p${stamp.slice(-4)}` })
      .returning();

    expect(inserted).toHaveLength(1);
    const p = inserted[0]!;

    await db.insert(schema.features).values({ projectId: p.id, codeSeq: 1, name: 'Login', content: 'Feature: Login' });

    await expect(
      db.insert(schema.features).values({ projectId: p.id, codeSeq: 2, name: 'LOGIN', content: 'Feature: LOGIN' }),
    ).rejects.toThrow();
  });
});
