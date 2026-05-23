import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { grantInstanceAdmin, grantProjectAccess, mkProject, mkUser } from '$testing/fixtures';

describe('authz fixtures', () => {
  it('grantProjectAccess inserts a user→project allow', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await grantProjectAccess(u.id, p.id);
    const rows = await db.select().from(policies).where(eq(policies.scopeId, p.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('*');
  });

  it('grantInstanceAdmin inserts a user→instance wildcard allow', async () => {
    const u = await mkUser();
    await grantInstanceAdmin(u.id);
    const rows = await db.select().from(policies).where(eq(policies.subjectId, u.id));
    expect(rows.some((r) => r.scopeKind === 'instance' && r.action === '*')).toBe(true);
  });
});
