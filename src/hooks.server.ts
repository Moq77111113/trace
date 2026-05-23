import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { auth } from '$lib/server/auth';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { ensureAdminInstancePolicies, backfillExistingProjectsBlanket } from '$lib/server/authz/seed';
import { readEnv } from '$lib/server/config/env';
import { bootstrapAdminFromEnv } from '$lib/server/instance/bootstrap-admin';
import { toDateOrNull } from '$lib/shared/lib/date';
import {
	ACCENT_COOKIE,
	THEME_COOKIE,
	parseAccent,
	parseTheme
} from '$lib/shared/lib/theme';

if (!building) {
	void bootstrapAdminFromEnv(readEnv('TRACE_BOOTSTRAP_ADMIN_EMAIL'))
		.then(() => ensureAdminInstancePolicies())
		.then(() => backfillExistingProjectsBlanket())
		.catch((err) => {
			console.error('authz bootstrap failed:', err);
		});
}

const authHandle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.session = session ?? null;
	if (session) {
		const u = session.user as typeof session.user & { role?: string; welcomedAt?: Date | string | null };
		const welcomedAt = toDateOrNull(u.welcomedAt);
		event.locals.user = {
			id:         u.id,
			email:      u.email,
			name:       u.name ?? null,
			role:       u.role === 'admin' ? 'admin' : 'user',
			welcomedAt,
		};
	} else {
		event.locals.user = null;
	}

	event.locals.authz = makeAuthorizer(event.locals.user);

	return resolve(event);
};

const themeHandle: Handle = ({ event, resolve }) => {
	const theme = parseTheme(event.cookies.get(THEME_COOKIE));
	const accent = parseAccent(event.cookies.get(ACCENT_COOKIE));
	event.locals.theme = theme;
	event.locals.accent = accent;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%trace.theme%', theme).replace('%trace.accent%', accent)
	});
};

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = sequence(authHandle, themeHandle, paraglideHandle);
