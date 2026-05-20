import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { PASSWORD_MIN_LENGTH } from '$lib/server/auth/constants';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.session) throw redirect(303, '/settings/account');
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const token = params.token ?? '';
		const data  = await request.formData();
		const np    = String(data.get('newPassword') ?? '');
		const cp    = String(data.get('confirmPassword') ?? '');

		if (!token) return fail(400, { error: m.error_reset_link_invalid() });
		if (np.length < PASSWORD_MIN_LENGTH) {
			return fail(400, { error: m.error_password_too_short({ min: PASSWORD_MIN_LENGTH }) });
		}
		if (np !== cp) return fail(400, { error: m.error_password_mismatch() });

		try {
			await auth.api.resetPassword({ body: { token, newPassword: np } });
		} catch {
			return fail(400, { error: m.error_reset_link_invalid() });
		}
		throw redirect(303, '/login?reset=ok');
	},
};
