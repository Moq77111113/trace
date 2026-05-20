import { fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const data  = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		if (!email) return fail(400, { done: false, email });

		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: '/reset-password' },
			});
		} catch {
			// anti-enumeration: swallow upstream errors so we always return the generic done state
		}
		return { done: true, email };
	},
};
