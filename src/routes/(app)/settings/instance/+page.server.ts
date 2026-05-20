import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user, projects } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/instance/require-admin';
import { getInstanceSettings, openSignup, closeSignup, getSmtp, updateSmtp, markSmtpTested } from '$lib/server/instance/settings';
import { sendTestMail } from '$lib/server/email/transport';
import { mintAdminResetLink, listRecentAdminResets } from '$lib/server/auth/admin-reset';
import { PASSWORD_RESET_TTL_MIN } from '$lib/server/auth/constants';
import { seedDemoProject } from '$lib/server/onboarding/seed';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';

const DEMO_NAME = 'Trace Demo';

export const load: PageServerLoad = async ({ locals, parent }) => {
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

	const smtp = await getSmtp();
	const recentAdminResets = await listRecentAdminResets(5);

	const { breadcrumbs } = await parent();
	return {
		settings,
		users,
		demoExists:  Boolean(demo),
		adminUserId: admin.id,
		smtp: {
			configured: Boolean(smtp.smtpHost),
			testedAt:   smtp.smtpTestedAt,
			initial: {
				host:   smtp.smtpHost,
				port:   smtp.smtpPort,
				user:   smtp.smtpUser,
				from:   smtp.smtpFrom,
				secure: smtp.smtpSecure,
			},
		},
		recentAdminResets,
		passwordResetTtlMin: PASSWORD_RESET_TTL_MIN,
		breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_instance() }),
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

	saveSmtp: async ({ locals, request }) => {
		const admin = requireAdmin(locals.user);
		const data  = await request.formData();
		const host           = String(data.get('host') ?? '').trim();
		const port           = Number(data.get('port') ?? 0);
		const userField      = String(data.get('user') ?? '');
		const password       = String(data.get('password') ?? '');
		const from           = String(data.get('from') ?? '').trim();
		const secure         = data.get('secure') === 'on';
		const changePassword = data.get('changePassword') === 'on' || (!data.has('changePassword') && Boolean(password));

		if (!host) return fail(400, { error: m.error_invalid_input() });
		if (!Number.isInteger(port) || port < 1 || port > 65_535) return fail(400, { error: m.error_invalid_input() });

		await updateSmtp({ host, port, user: userField, password, from, secure, changePassword, updatedBy: admin.id });
		return { smtpSaved: true };
	},

	sendTestEmail: async ({ locals, request }) => {
		const admin = requireAdmin(locals.user);
		const data  = await request.formData();
		const host     = String(data.get('host') ?? '').trim();
		const port     = Number(data.get('port') ?? 0);
		const userField = String(data.get('user') ?? '');
		const password = String(data.get('password') ?? '');
		const from     = String(data.get('from') ?? '').trim();
		const secure   = data.get('secure') === 'on';
		if (!host || !from) return fail(400, { testFail: m.error_smtp_test_no_config() });

		try {
			const out = await sendTestMail({ host, port, user: userField, password, from, secure, to: admin.email });
			await markSmtpTested(admin.id);
			return { testOk: { messageId: out.messageId } };
		} catch (err) {
			const reason = err instanceof Error ? err.message : 'unknown';
			return fail(400, { testFail: reason });
		}
	},

	mintResetLink: async ({ locals, request, url }) => {
		const admin = requireAdmin(locals.user);
		const data  = await request.formData();
		const targetUserId = String(data.get('targetUserId') ?? '');
		if (!targetUserId) return fail(400, { error: m.error_admin_reset_user_not_found() });

		try {
			const { url: mintedUrl, expiresAt } = await mintAdminResetLink({
				targetUserId,
				mintedByUserId: admin.id,
				origin:         url.origin,
			});
			return { mintedUrl, mintedExpiresAt: expiresAt };
		} catch {
			return fail(400, { error: m.error_admin_reset_user_not_found() });
		}
	},
};
