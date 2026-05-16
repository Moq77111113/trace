import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features, projects } from '$lib/server/db/schema';
import { listProjectsWithStats, listRecentExecutions } from '$lib/server/projects/queries';
import { appendCrumb } from '$lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
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

export const load = (async ({ locals, parent }) => {
	const { breadcrumbs } = await parent();
	return {
		projects:    await listProjectsWithStats(),
		recentRuns:  await listRecentExecutions(20),
		welcome:     await loadWelcome(locals),
		breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_projects() }),
	};
}) satisfies PageServerLoad;
