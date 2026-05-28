import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { campaigns, campaignFeatures, executions } from '$lib/server/db/schema';
import { load } from '~/src/routes/(reports)/p/[slug]/campaigns/[campaignId]/report.html/+page.server';
import { mkFeature, mkProject } from '$testing/fixtures';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantAnyUserBlanket } from '$lib/server/authz/seed';

type LoadEvent = Parameters<typeof load>[0];

async function seedCampaign() {
  const p = await mkProject({ name: `Camp ${Date.now()}-${Math.random()}` });
  await grantAnyUserBlanket(p.id);
  const f = await mkFeature(p.id, { name: 'Login', content: `Feature: Login\n\n  Scenario: A\n    Given x\n` });
  const [c] = await db.insert(campaigns).values({
    projectId: p.id, name: `Release ${Math.random()}`, appVersion: '1.0.0', createdBy: 'tester',
  }).returning();
  if (!c) throw new Error('seed campaign');
  await db.insert(campaignFeatures).values({ campaignId: c.id, featureId: f.id, required: true, position: 1 });
  await db.insert(executions).values({
    featureId: f.id, source: 'MANUAL', executedBy: 'Alice', environment: 'staging',
    featureContentAtStart: `Feature: Login\n`, status: 'PASSED',
    startedAt: new Date(), finishedAt: new Date(), campaignId: c.id,
  });
  return { slug: p.slug, campaignId: c.id };
}

function buildEvent(slug: string, campaignId: string, search = ''): LoadEvent {
  const url = new URL(`http://localhost/p/${slug}/campaigns/${campaignId}/report.html${search}`);
  const user = { id: '00000000-0000-7000-8000-000000000099', email: 'u@x', name: null, role: 'user' as const, welcomedAt: null };
  const locals = { user, session: { id: 's' }, authz: makeAuthorizer(user) };
  return { params: { slug, campaignId }, url, locals } as unknown as LoadEvent;
}

async function invoke(event: LoadEvent) {
  try { return { ok: true as const, data: await load(event) }; }
  catch (e) {
    if (e && typeof e === 'object' && 'status' in e) return { ok: false as const, status: (e as { status: number }).status };
    throw e;
  }
}

describe('campaign report load', () => {
  it('returns campaign + members + per-member evidence + parsed scope', async () => {
    const { slug, campaignId } = await seedCampaign();
    const out = await invoke(buildEvent(slug, campaignId, '?scope=required'));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.campaign.name).toBeDefined();
      expect(out.data.members.length).toBe(1);
      expect(out.data.members[0]?.evidence).not.toBeNull();
      expect(out.data.scope).toBe('required');
    }
  });
});
