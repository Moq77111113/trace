import type { LayoutServerLoad } from './$types';
import { requireInstanceAdmin } from '$lib/server/instance/authz';

export const load: LayoutServerLoad = async ({ locals }) => {
	await requireInstanceAdmin(locals.authz);
	return {};
};
