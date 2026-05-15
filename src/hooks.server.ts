import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { auth } from '$lib/server/auth';

const authHandle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.session = session ?? null;
	event.locals.user = session
		? { id: session.user.id, email: session.user.email, name: session.user.name ?? null }
		: null;

	return resolve(event);
};

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = sequence(authHandle, paraglideHandle);
