import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { executions } from '$lib/server/db/schema';
import { createCampaign } from '$lib/server/campaigns/lifecycle/create';
import { addMember, setMemberRequired } from '$lib/server/campaigns/lifecycle/members';
import { computeProgress } from '$lib/server/campaigns/progress';
import { mkProject, mkFeature } from '$testing/fixtures';

async function tag(featureId: string, campaignId: string, status: 'PASSED' | 'FAILED', startedAt: Date) {
  await db.insert(executions).values({
    featureId, source: 'CI', executedBy: 'ci', featureContentAtStart: 'x', status, startedAt, campaignId,
  });
}

describe('computeProgress', () => {
  it('counts the latest tagged execution per member and reports PASSED when all required pass', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const f2 = await mkFeature(project.id);
    const c = await createCampaign({ projectId: project.id, name: 'P1', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: f1.id });
    await addMember({ campaignId: c.id, featureId: f2.id });

    await tag(f1.id, c.id, 'FAILED', new Date('2026-01-01T00:00:00Z'));
    await tag(f1.id, c.id, 'PASSED', new Date('2026-01-02T00:00:00Z'));
    await tag(f2.id, c.id, 'PASSED', new Date('2026-01-01T00:00:00Z'));

    const p = await computeProgress(c.id);
    expect(p.requiredTotal).toBe(2);
    expect(p.requiredPassed).toBe(2);
    expect(p.executed).toBe(2);
    expect(p.outcome).toBe('PASSED');
  });

  it('reports FAILED and counts not-run when a required member has no tagged execution', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const f2 = await mkFeature(project.id);
    const c = await createCampaign({ projectId: project.id, name: 'P2', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: f1.id });
    await addMember({ campaignId: c.id, featureId: f2.id });
    await tag(f1.id, c.id, 'PASSED', new Date('2026-01-01T00:00:00Z'));

    const p = await computeProgress(c.id);
    expect(p.requiredNotRun).toBe(1);
    expect(p.executed).toBe(1);
    expect(p.outcome).toBe('FAILED');
  });

  it('ignores optional members in the verdict', async () => {
    const project = await mkProject();
    const required = await mkFeature(project.id);
    const optional = await mkFeature(project.id);
    const c = await createCampaign({ projectId: project.id, name: 'P3', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: required.id });
    await addMember({ campaignId: c.id, featureId: optional.id });
    await setMemberRequired({ campaignId: c.id, featureId: optional.id, required: false });
    await tag(required.id, c.id, 'PASSED', new Date('2026-01-01T00:00:00Z'));
    await tag(optional.id, c.id, 'FAILED', new Date('2026-01-01T00:00:00Z'));

    const p = await computeProgress(c.id);
    expect(p.outcome).toBe('PASSED');
    expect(p.optionalTotal).toBe(1);
  });

  it('does not count an untagged execution of a member feature', async () => {
    const project = await mkProject();
    const f1 = await mkFeature(project.id);
    const c = await createCampaign({ projectId: project.id, name: 'P4', appVersion: '1', createdBy: 'x' });
    await addMember({ campaignId: c.id, featureId: f1.id });
    await db.insert(executions).values({
      featureId: f1.id, source: 'MANUAL', executedBy: 'x', featureContentAtStart: 'x', status: 'PASSED',
      startedAt: new Date('2026-01-01T00:00:00Z'), campaignId: null,
    });

    const p = await computeProgress(c.id);
    expect(p.executed).toBe(0);
    expect(p.requiredNotRun).toBe(1);
    expect(p.outcome).toBe('FAILED');
  });
});
