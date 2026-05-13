import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

// Auth handler is intentionally absent during M1–M5 (no-auth phase per spec §12.1).
// M6.3 re-introduces the auth-guard handler on top of paraglide.

export const handle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale)),
		});
	});
