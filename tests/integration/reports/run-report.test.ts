import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { load } from '~/src/routes/(reports)/p/[slug]/executions/[eid]/report.html/+page.server';
import { mkFeature, mkProject } from '$testing/fixtures';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantAnyUserBlanket } from '$lib/server/authz/seed';

type LoadEvent = Parameters<typeof load>[0];

async function seedRun(): Promise<{ slug: string; eid: string }> {
  const p = await mkProject({ name: `Run ${Date.now()}-${Math.random()}` });
  await grantAnyUserBlanket(p.id);
  const f = await mkFeature(p.id, { name: 'Login', content: `Feature: Login\n\n  Scenario: A\n    Given x\n` });
  const [r] = await db.insert(executions).values({
    featureId: f.id,
    source: 'MANUAL',
    executedBy: 'Alice',
    environment: 'staging',
    featureContentAtStart: `Feature: Login\n`,
    status: 'PASSED',
    startedAt: new Date(),
    finishedAt: new Date(),
  }).returning();
  if (!r) throw new Error('seed');
  return { slug: p.slug, eid: r.id };
}

function buildEvent(slug: string, eid: string, search = '', opts: { authed?: boolean } = { authed: true }): LoadEvent {
  const url = new URL(`http://localhost/p/${slug}/executions/${eid}/report.html${search}`);
  const user = { id: '00000000-0000-7000-8000-000000000099', email: 'u@x', name: null, role: 'user' as const, welcomedAt: null };
  const locals = opts.authed
    ? { user, session: { id: 's' }, authz: makeAuthorizer(user) }
    : { user: null, session: null, authz: makeAuthorizer(null) };
  return { params: { slug, eid }, url, locals } as unknown as LoadEvent;
}

async function invoke(event: LoadEvent) {
  try { return { ok: true as const, data: await load(event) }; }
  catch (e) {
    if (e && typeof e === 'object' && 'status' in e) return { ok: false as const, status: (e as { status: number }).status };
    throw e;
  }
}

describe('per-run report load', () => {
  it('returns the execution page data plus the parsed scope', async () => {
    const { slug, eid } = await seedRun();
    const out = await invoke(buildEvent(slug, eid, '?scope=failed'));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.execution.id).toBe(eid);
      expect(out.data.scope).toBe('failed');
    }
  });

  it('defaults scope to "full" when missing', async () => {
    const { slug, eid } = await seedRun();
    const out = await invoke(buildEvent(slug, eid));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.data.scope).toBe('full');
  });

  it('404s when the execution is not in the project', async () => {
    const { eid } = await seedRun();
    const other = await mkProject({ name: `Other ${Date.now()}-${Math.random()}` });
    await grantAnyUserBlanket(other.id);
    const out = await invoke(buildEvent(other.slug, eid));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(404);
  });
});
