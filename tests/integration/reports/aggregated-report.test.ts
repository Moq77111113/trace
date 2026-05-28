import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { load } from '~/src/routes/(reports)/p/[slug]/executions/report.html/+page.server';
import { mkFeature, mkProject } from '$testing/fixtures';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantAnyUserBlanket } from '$lib/server/authz/seed';

type LoadEvent = Parameters<typeof load>[0];

async function seedProjectWith(n: number) {
  const p = await mkProject({ name: `Agg ${Date.now()}-${Math.random()}` });
  await grantAnyUserBlanket(p.id);
  const f = await mkFeature(p.id, { name: 'Login', content: `Feature: Login\n\n  Scenario: A\n    Given x\n` });
  for (let i = 0; i < n; i++) {
    await db.insert(executions).values({
      featureId: f.id, source: 'MANUAL', executedBy: 'Alice', environment: 'staging',
      featureContentAtStart: `Feature: Login\n`, status: 'PASSED',
      startedAt: new Date(Date.now() - i * 1000), finishedAt: new Date(),
    });
  }
  return p;
}

function buildEvent(slug: string, search = ''): LoadEvent {
  const url  = new URL(`http://localhost/p/${slug}/executions/report.html${search}`);
  const user = { id: '00000000-0000-7000-8000-000000000099', email: 'u@x', name: null, role: 'user' as const, welcomedAt: null };
  const locals = { user, session: { id: 's' }, authz: makeAuthorizer(user) };
  return { params: { slug }, url, locals } as unknown as LoadEvent;
}

async function invoke(event: LoadEvent) {
  try { return { ok: true as const, data: await load(event) }; }
  catch (e) {
    if (e && typeof e === 'object' && 'status' in e) return { ok: false as const, status: (e as { status: number }).status };
    throw e;
  }
}

describe('aggregated report load', () => {
  it('returns rows and parses scope=failed', async () => {
    const p = await seedProjectWith(3);
    const out = await invoke(buildEvent(p.slug, '?scope=failed'));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.rows.length).toBe(3);
      expect(out.data.scope).toBe('failed');
    }
  });
});
