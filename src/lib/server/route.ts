import { error, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import { authenticateCi } from '$lib/server/api-keys';

export type AuthedLocals = App.Locals & {
	user:    NonNullable<App.Locals['user']>;
	session: NonNullable<App.Locals['session']>;
};

export type AuthedRequestEvent<P extends Partial<Record<string, string>> = Partial<Record<string, string>>> =
	Omit<RequestEvent<P>, 'locals'> & { locals: AuthedLocals };

export function authedHandler<P extends Partial<Record<string, string>> = Partial<Record<string, string>>>(
	handler: (event: AuthedRequestEvent<P>) => Response | Promise<Response>,
): RequestHandler<P> {
	return async (event) => {
		if (!event.locals.user || !event.locals.session) {
			throw error(401, 'unauthorized');
		}

		return handler(event as AuthedRequestEvent<P>);
	};
}

export type CiAuth = { executor: string; projectId: string };

export function ciHandler<P extends Partial<Record<string, string>> = Partial<Record<string, string>>>(
	handler: (event: RequestEvent<P>, ci: CiAuth) => Response | Promise<Response>,
): RequestHandler<P> {
	return async (event) => {
		const projectId =
			event.request.headers.get('x-project-id') ?? event.url.searchParams.get('project');
		if (!projectId) throw error(400, 'X-Project-Id header (or ?project=) required');

		let executor: string;
		try {
			const { tokenName } = await authenticateCi(
				event.request.headers.get('authorization'),
				projectId,
			);
			executor = tokenName;
		} catch (e) {
			throw error(401, e instanceof Error ? e.message : 'unauthorized');
		}

		return handler(event, { executor, projectId });
	};
}
