import type { RequestHandler } from './$types';
import {
	ACCENT_COOKIE,
	THEME_COOKIE,
	parseAccent,
	parseTheme
} from '$lib/shared/lib/theme';

const ONE_YEAR = 60 * 60 * 24 * 365;

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => ({}))) as {
		theme?: string;
		accent?: string;
	};

	if (body.theme !== undefined) {
		cookies.set(THEME_COOKIE, parseTheme(body.theme), {
			path: '/',
			maxAge: ONE_YEAR,
			sameSite: 'lax'
		});
	}

	if (body.accent !== undefined) {
		cookies.set(ACCENT_COOKIE, parseAccent(body.accent), {
			path: '/',
			maxAge: ONE_YEAR,
			sameSite: 'lax'
		});
	}

	return new Response(null, { status: 204 });
};
