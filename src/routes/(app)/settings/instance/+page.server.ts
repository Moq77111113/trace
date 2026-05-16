import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user, projects } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/instance/require-admin';
import { getInstanceSettings, openSignup, closeSignup } from '$lib/server/instance/settings';
import { seedDemoProject } from '$lib/server/onboarding/seed';
import * as m from '$lib/paraglide/messages';

const DEMO_NAME = 'Trace Demo';

export const load: PageServerLoad = async ({ locals }) => {
	const admin    = requireAdmin(locals.user);
	const settings = await getInstanceSettings();
	const users    = await db
		.select({
			id:        user.id,
			email:     user.email,
			name:      user.name,
			role:      user.role,
			createdAt: user.createdAt,
		})
		.from(user)
		.orderBy(asc(user.createdAt));
	const [demo] = await db
		.select({ id: projects.id })
		.from(projects)
		.where(eq(projects.name, DEMO_NAME));

	return {
		settings,
		users,
		demoExists:  Boolean(demo),
		adminUserId: admin.id,
	};
};

export const actions: Actions = {
	open: async ({ locals, request }) => {
		const admin = requireAdmin(locals.user);
		const data  = await request.formData();
		const budgetRaw = data.get('budget');
		const budget    = budgetRaw === null ? NaN : Number(budgetRaw);
		const windowRaw = data.get('windowEndsAt')?.toString() ?? '';
		const windowEndsAt = windowRaw ? new Date(windowRaw) : null;

		if (!Number.isInteger(budget) || budget <= 0) {
			return fail(400, { error: m.error_budget_must_be_positive() });
		}
		if (windowEndsAt && Number.isNaN(windowEndsAt.getTime())) {
			return fail(400, { error: m.error_invalid_date() });
		}

		await openSignup({ budget, windowEndsAt, updatedBy: admin.id });
		return { opened: true };
	},

	close: async ({ locals }) => {
		const admin = requireAdmin(locals.user);
		await closeSignup({ updatedBy: admin.id });
		return { closed: true };
	},

	reseed: async ({ locals }) => {
		const admin = requireAdmin(locals.user);
		await seedDemoProject(admin.id);
		return { reseeded: true };
	},
};
