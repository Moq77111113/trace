import { error, type RequestEvent } from '@sveltejs/kit';
import { authenticateCi } from '$lib/server/api-keys';
import { userDisplayName } from '$lib/auth/format';

export function resolveLiveExecutor(event: RequestEvent): string {
	if (!event.locals.user) throw error(401, 'unauthorized');
	return userDisplayName(event.locals.user);
}

export async function resolveCiExecutor(event: RequestEvent): Promise<string> {
	const projectId =
		event.request.headers.get('x-project-id') ?? event.url.searchParams.get('project');
	if (!projectId) throw error(400, 'X-Project-Id header (or ?project=) required');

	try {
		const { tokenName } = await authenticateCi(
			event.request.headers.get('authorization'),
			projectId
		);
		return tokenName;
	} catch (e) {
		throw error(401, e instanceof Error ? e.message : 'unauthorized');
	}
}
