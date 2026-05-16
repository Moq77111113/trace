import { fail, redirect } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';
import { auth, isOidcEnabled } from '$lib/server/auth';
import { db } from '$lib/server/db/client';
import { user } from '$lib/server/db/schema';
import { getInstanceSettings } from '$lib/server/instance/settings';
import { isSignupOpen } from '$lib/server/instance/signup-state';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	if (locals.session) {
		const next = sanitizeNext(url.searchParams.get('next'));
		throw redirect(303, next);
	}

	const [adminRow] = await db.select({ c: count() }).from(user).where(eq(user.role, 'admin'));
	const adminExists = (adminRow?.c ?? 0) > 0;
	const settings    = await getInstanceSettings();
	const signupOpen  = isSignupOpen({
		signupBudget:       settings.signupBudget,
		signupWindowEndsAt: settings.signupWindowEndsAt,
	});

	return { oidcEnabled: isOidcEnabled, adminExists, signupOpen };
}) satisfies PageServerLoad;

type FormState = { error: string; mode: 'signin' | 'signup'; email?: string; name?: string };

function failForm(status: number, state: FormState) {
	return fail(status, state);
}

function sanitizeNext(raw: string | null): string {
	if (!raw) return '/';
	if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
	return raw;
}

export const actions = {
	signin: async ({ request, url }) => {
		const data = Object.fromEntries(await request.formData());
		const email = String(data.email ?? '').trim();
		const password = String(data.password ?? '');

		if (!email || !password) {
			return failForm(400, { error: m.error_email_password_required(), mode: 'signin', email });
		}

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch {
			return failForm(401, { error: m.error_bad_credentials(), mode: 'signin', email });
		}

		throw redirect(303, sanitizeNext(url.searchParams.get('next')));
	},

	signup: async ({ request, url }) => {
		const data = Object.fromEntries(await request.formData());
		const email = String(data.email ?? '').trim();
		const password = String(data.password ?? '');
		const name = String(data.name ?? '').trim();

		if (!email || !password || !name) {
			return failForm(400, { error: m.error_signup_fields_required(), mode: 'signup', email, name });
		}

		try {
			await auth.api.signUpEmail({ body: { email, password, name } });
		} catch {
			return failForm(400, { error: m.error_could_not_create_account(), mode: 'signup', email, name });
		}

		throw redirect(303, sanitizeNext(url.searchParams.get('next')));
	},

	oidc: async ({ url }) => {
		if (!isOidcEnabled) {
			return failForm(400, { error: m.error_oidc_not_configured(), mode: 'signin' });
		}

		const result = await auth.api.signInWithOAuth2({
			body: { providerId: 'oidc', callbackURL: sanitizeNext(url.searchParams.get('next')) }
		});

		if (!result?.url) {
			return failForm(500, { error: m.error_oidc_redirect_failed(), mode: 'signin' });
		}

		throw redirect(303, result.url);
	}
} satisfies Actions;
