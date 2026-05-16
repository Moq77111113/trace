import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { auth } from '$lib/server/auth';
import {
	ACCENT_COOKIE,
	THEME_COOKIE,
	parseAccent,
	parseTheme
} from '$lib/theme';

const authHandle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.session = session ?? null;
	event.locals.user = session
		? { id: session.user.id, email: session.user.email, name: session.user.name ?? null }
		: null;

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
