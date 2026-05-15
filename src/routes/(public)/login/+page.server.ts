import { fail, redirect } from '@sveltejs/kit';
import { auth, isOidcEnabled } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	if (locals.session) {
		const next = sanitizeNext(url.searchParams.get('next'));
		throw redirect(303, next);
	}

	return { oidcEnabled: isOidcEnabled };
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
			return failForm(400, { error: 'Email and password required', mode: 'signin', email });
		}

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch {
			return failForm(401, { error: 'Invalid credentials', mode: 'signin', email });
		}

		throw redirect(303, sanitizeNext(url.searchParams.get('next')));
	},

	signup: async ({ request, url }) => {
		const data = Object.fromEntries(await request.formData());
		const email = String(data.email ?? '').trim();
		const password = String(data.password ?? '');
		const name = String(data.name ?? '').trim();

		if (!email || !password || !name) {
			return failForm(400, { error: 'Name, email, and password required', mode: 'signup', email, name });
		}

		try {
			await auth.api.signUpEmail({ body: { email, password, name } });
		} catch {
			return failForm(400, { error: 'Could not create account (email may already exist)', mode: 'signup', email, name });
		}

		throw redirect(303, sanitizeNext(url.searchParams.get('next')));
	},

	oidc: async ({ url }) => {
		if (!isOidcEnabled) {
			return failForm(400, { error: 'OIDC is not configured on this server', mode: 'signin' });
		}

		const result = await auth.api.signInWithOAuth2({
			body: { providerId: 'oidc', callbackURL: sanitizeNext(url.searchParams.get('next')) }
		});

		if (!result?.url) {
			return failForm(500, { error: 'OIDC redirect URL missing', mode: 'signin' });
		}

		throw redirect(303, result.url);
	}
} satisfies Actions;
