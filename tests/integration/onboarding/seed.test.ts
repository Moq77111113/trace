import { describe, it, expect, beforeEach } from 'vitest';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import {
	projects,
	features,
	featureGroups,
	executions,
	scenarioResults,
	campaigns,
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

describe('seedDemoProject', () => {
	beforeEach(async () => {
		await clearDemo();
	});

	it('creates the demo project with the expected name and description', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p] = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		expect(p).toBeDefined();
		expect(p?.description).toMatch(/demo/i);
	});

	it('creates two feature groups and four features under the demo project', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p] = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		const groups = await db.select().from(featureGroups).where(eq(featureGroups.projectId, p!.id));
		const feats  = await db.select().from(features).where(eq(features.projectId, p!.id));
		expect(groups).toHaveLength(2);
		expect(feats).toHaveLength(4);
	});

	it('creates one finished standalone run with mixed scenario statuses', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		const [p]    = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		const feats  = await db.select({ id: features.id }).from(features).where(eq(features.projectId, p!.id));
		const standaloneRuns = await db
			.select()
			.from(executions)
			.where(and(inArray(executions.featureId, feats.map((f) => f.id)), isNull(executions.campaignId)));
		expect(standaloneRuns).toHaveLength(1);
		const run = standaloneRuns[0];
		if (!run) throw new Error('expected the standalone demo run');
		expect(run.finishedAt).not.toBeNull();

		const sr = await db.select().from(scenarioResults).where(eq(scenarioResults.executionId, run.id));
		const statuses = new Set(sr.map((r) => r.status));
		expect(statuses.has('PASSED')).toBe(true);
		expect(statuses.has('FAILED')).toBe(true);
	});

	it('is idempotent — skips if a Trace Demo project already exists', async () => {
		const admin = await seedAdmin();
		await seedDemoProject(admin.id);
		await seedDemoProject(admin.id);
		const demos = await db.select().from(projects).where(eq(projects.name, DEMO_NAME));
		expect(demos).toHaveLength(1);
	});
});
