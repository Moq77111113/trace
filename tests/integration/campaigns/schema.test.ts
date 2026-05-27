import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns, campaignFeatures, executions } from '$lib/server/db/schema';
import { mkProject, mkFeature } from '$testing/fixtures';

async function mkCampaign(projectId: string, name: string, appVersion: string) {
  const [c] = await db
    .insert(campaigns)
    .values({ projectId, name, appVersion, createdBy: 'tester' })
    .returning();
  if (!c) throw new Error('mkCampaign: insert returned no row');
  return c;
}

describe('campaigns schema', () => {
  it('inserts a campaign with OPEN default and null outcome', async () => {
    const project = await mkProject();
    const c = await mkCampaign(project.id, 'Release 1.0', '1.0.0');
    expect(c.status).toBe('OPEN');
    expect(c.outcome).toBeNull();
    expect(c.openedAt).toBeInstanceOf(Date);
  });

  it('links a feature into a campaign via the ordered junction (required defaults true)', async () => {
    const project = await mkProject();
    const feature = await mkFeature(project.id);
    const c = await mkCampaign(project.id, 'Release 1.1', '1.1.0');
    await db.insert(campaignFeatures).values({ campaignId: c.id, featureId: feature.id, position: 1 });
    const rows = await db.select().from(campaignFeatures).where(eq(campaignFeatures.campaignId, c.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.required).toBe(true);
  });

  it('tags an execution with a campaign id', async () => {
    const project = await mkProject();
    const feature = await mkFeature(project.id);
    const c = await mkCampaign(project.id, 'Release 1.2', '1.2.0');
    const [run] = await db
      .insert(executions)
      .values({ featureId: feature.id, source: 'MANUAL', executedBy: 'tester', featureContentAtStart: 'x', campaignId: c.id })
      .returning();
    if (!run) throw new Error('execution insert returned no row');
    expect(run.campaignId).toBe(c.id);
  });

  it('forbids two OPEN campaigns sharing a version in one project, but allows reuse after close', async () => {
    const project = await mkProject();
    await db.insert(campaigns).values({ projectId: project.id, name: 'A', appVersion: '7.0.0', createdBy: 't' });

    await expect(
      db.insert(campaigns).values({ projectId: project.id, name: 'B', appVersion: '7.0.0', createdBy: 't' }),
    ).rejects.toThrow();

    await db.update(campaigns).set({ status: 'CLOSED' }).where(eq(campaigns.projectId, project.id));
    const reopened = await db
      .insert(campaigns)
      .values({ projectId: project.id, name: 'C', appVersion: '7.0.0', createdBy: 't' })
      .returning();
    expect(reopened).toHaveLength(1);
  });
});
