import { error, type RequestEvent, type RequestHandler } from '@sveltejs/kit';

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
