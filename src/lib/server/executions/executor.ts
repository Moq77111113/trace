import { error, type RequestEvent } from '@sveltejs/kit';
import { userDisplayName } from '$lib/shared/auth/format';

export function resolveLiveExecutor(event: RequestEvent): string {
	if (!event.locals.user) throw error(401, 'unauthorized');
	return userDisplayName(event.locals.user);
}
