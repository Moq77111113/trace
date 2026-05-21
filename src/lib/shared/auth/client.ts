import { createAuthClient } from 'better-auth/svelte';
import { genericOAuthClient } from 'better-auth/client/plugins';

export function createAuthApi() {
	return createAuthClient({
		baseURL: typeof window === 'undefined' ? '' : window.location.origin,
		plugins: [genericOAuthClient()]
	});
}
