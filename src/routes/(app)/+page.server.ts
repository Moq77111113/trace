import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects } from '$lib/server/db/schema';
import { listProjectsWithStats, listRecentRuns } from '$lib/server/projects/queries';
import type { PageServerLoad } from './$types';

const DEMO_NAME = 'Trace Demo';

async function loadWelcome(locals: App.Locals) {
	if (!locals.user || locals.user.welcomedAt) return null;
	const [demo] = await db
		.select({ id: projects.id, name: projects.name })
		.from(projects)
		.where(eq(projects.name, DEMO_NAME));
	if (!demo) return null;
	const [firstFeature] = await db
		.select({ id: features.id })
		.from(features)
		.where(eq(features.projectId, demo.id))
		.orderBy(asc(features.createdAt))
		.limit(1);
	return {
		projectId:   demo.id,
		projectName: demo.name,
		featureId:   firstFeature?.id ?? null,
	};
}

export const load = (async ({ locals }) => ({
	projects:   await listProjectsWithStats(),
	recentRuns: await listRecentRuns(20),
	welcome:    await loadWelcome(locals),
})) satisfies PageServerLoad;
