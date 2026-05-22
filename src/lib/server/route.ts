import { error, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import { authenticateCi, type CiAuthErrorCode } from '$lib/server/api-keys';
import type { ParseErrorCode }     from '$lib/server/executions/ingest/cucumber-json/parse';
import type { IngestRunErrorCode } from '$lib/server/executions/ingest/pipeline';

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

export type CiHttpErrorCode = CiAuthErrorCode | ParseErrorCode | IngestRunErrorCode;

export const CI_HTTP_MAPPING: Record<CiHttpErrorCode, { status: number; message: string }> = {
	CI_AUTH_HEADER_MISSING:     { status: 401, message: 'Authorization header required' },
	CI_AUTH_SCHEME_INVALID:     { status: 401, message: 'Bearer token required' },
	CI_AUTH_KEY_INVALID:        { status: 401, message: 'invalid API key' },
	CI_AUTH_KEY_NO_PROJECT:     { status: 500, message: 'api key not bound to a project' },
	PARSE_EMPTY_PAYLOAD:        { status: 400, message: 'cucumber.json: no features in payload' },
	PARSE_INVALID_JSON:         { status: 400, message: 'invalid JSON body' },
	PARSE_SCHEMA_INVALID:       { status: 400, message: 'cucumber.json: schema invalid' },
	INGEST_NO_FEATURES_MATCHED: { status: 404, message: 'no feature matching any payload entry' },
};

export function ciHandler<P extends Partial<Record<string, string>> = Partial<Record<string, string>>>(
	handler: (event: RequestEvent<P>, ci: CiAuth) => Response | Promise<Response>,
): RequestHandler<P> {
	return async (event) => {
		const auth = await authenticateCi(event.request.headers.get('authorization'));
		if (!auth.ok) {
			const http = CI_HTTP_MAPPING[auth.error.code];
			throw error(http.status, { code: auth.error.code, message: http.message });
		}
		return handler(event, { executor: auth.value.tokenName, projectId: auth.value.projectId });
	};
}
