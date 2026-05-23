import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { load } from '../../../src/routes/(app)/p/[slug]/executions/[eid]/+page.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { mkFeature, mkProject, mkUser } from '$testing/fixtures';

const userObj = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

it('execution detail load 403s without execution.review', async () => {
  const u = await mkUser(); const p = await mkProject(); const f = await mkFeature(p.id);
  const rows = await db.insert(executions).values({ featureId: f.id, source: 'MANUAL', executedBy: u.id, featureContentAtStart: f.content, status: 'IN_PROGRESS' }).returning();
  const exec = rows[0];
  if (!exec) throw new Error('fixture: execution insert returned no row');
  const u0 = userObj(u.id);
  const event = { params: { slug: p.slug, eid: exec.id }, parent: async () => ({ breadcrumbs: [], project: p }), locals: { user: u0, authz: makeAuthorizer(u0) } } as unknown as Parameters<typeof load>[0];
  await expect(load(event)).rejects.toMatchObject({ status: 403 });
});
