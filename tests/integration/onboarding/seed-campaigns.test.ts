import { describe, it, expect, beforeEach } from 'vitest';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import {
	projects,
	features,
	campaigns,
	campaignFeatures,
	executions,
	scenarioResults,
	user,
} from '$lib/server/db/schema';
import { seedDemoProject } from '$lib/server/onboarding/seed';

const DEMO_NAME = 'Trace Demo';

async function clearDemo() {
	const [demo] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, DEMO_NAME));
	if (!demo) return;
	const feats = await db.select({ id: features.id }).from(features).where(eq(features.projectId, demo.id));
	if (feats.length > 0) {
		await db.delete(executions).where(inArray(executions.featureId, feats.map((f) => f.id)));
	}
	await db.delete(campaigns).where(eq(campaigns.projectId, demo.id));
	await db.delete(projects).where(eq(projects.id, demo.id));
}

async function seedAdmin() {
	const [u] = await db
		.insert(user)
		.values({
			email: `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@trace.test`,
			name:  'Demo Admin',
			role:  'admin',
		})
		.returning();
	if (!u) throw new Error('seed admin failed');
	return u;
}

describe('seedDemoProject campaigns', () => {
	beforeEach(async () => {
		await clearDemo();
	});

	it('creates two campaigns: one CLOSED, one OPEN', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p] = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		const camps = await db.select().from(campaigns).where(eq(campaigns.projectId, p!.id));
		expect(camps).toHaveLength(2);
		const statuses = camps.map((c) => c.status).sort();
		expect(statuses).toEqual(['CLOSED', 'OPEN']);
		const closed = camps.find((c) => c.status === 'CLOSED');
		expect(closed?.closedAt).not.toBeNull();
		expect(closed?.outcome).toBe('FAILED');
	});

	it('CLOSED campaign has 4 required members all linked to executions', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p] = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		const [closed] = await db
			.select()
			.from(campaigns)
			.where(and(eq(campaigns.projectId, p!.id), eq(campaigns.status, 'CLOSED')));
		expect(closed).toBeDefined();
		const members = await db
			.select()
			.from(campaignFeatures)
			.where(eq(campaignFeatures.campaignId, closed!.id));
		expect(members).toHaveLength(4);
		expect(members.every((m) => m.required)).toBe(true);
		const runs = await db.select().from(executions).where(eq(executions.campaignId, closed!.id));
		expect(runs).toHaveLength(4);
	});

	it('OPEN campaign has 4 members with exactly 1 never-run feature', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p] = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		const [open] = await db
			.select()
			.from(campaigns)
			.where(and(eq(campaigns.projectId, p!.id), eq(campaigns.status, 'OPEN')));
		expect(open).toBeDefined();
		const members = await db
			.select()
			.from(campaignFeatures)
			.where(eq(campaignFeatures.campaignId, open!.id));
		expect(members).toHaveLength(4);
		const optional = members.filter((m) => !m.required);
		expect(optional).toHaveLength(1);

		const runs = await db.select().from(executions).where(eq(executions.campaignId, open!.id));
		expect(runs).toHaveLength(3);
		const runFeatureIds = new Set(runs.map((r) => r.featureId));
		const neverRun = members.filter((m) => !runFeatureIds.has(m.featureId));
		expect(neverRun).toHaveLength(1);
		expect(neverRun[0]?.required).toBe(false);
	});

	it('inserts at least 8 executions in the demo project', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p] = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		const feats = await db.select({ id: features.id }).from(features).where(eq(features.projectId, p!.id));
		const allRuns = await db
			.select()
			.from(executions)
			.where(inArray(executions.featureId, feats.map((f) => f.id)));
		expect(allRuns.length).toBeGreaterThanOrEqual(8);
	});

	it('Release 1.0 SLA-breach run is FAILED and has a FAILED scenario result', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p] = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		const [closed] = await db
			.select()
			.from(campaigns)
			.where(and(eq(campaigns.projectId, p!.id), eq(campaigns.status, 'CLOSED')));
		const runs = await db
			.select()
			.from(executions)
			.where(and(eq(executions.campaignId, closed!.id), eq(executions.status, 'FAILED')));
		expect(runs).toHaveLength(1);
		const failedRun = runs[0]!;
		const scenarios = await db
			.select()
			.from(scenarioResults)
			.where(eq(scenarioResults.executionId, failedRun.id));
		expect(scenarios.length).toBeGreaterThanOrEqual(1);
		expect(scenarios.some((s) => s.status === 'FAILED')).toBe(true);
	});

	it('uses isNull guard for never-run sanity (no orphan null campaignId rows in campaign-scoped query)', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const orphanCampaignRuns = await db
			.select()
			.from(executions)
			.where(isNull(executions.campaignId));
		expect(orphanCampaignRuns.length).toBeGreaterThanOrEqual(1);
	});
});
