import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/instance/require-admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	return {};
};
