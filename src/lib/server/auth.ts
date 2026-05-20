import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { apiKey, genericOAuth } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db/client';
import { readEnv, requireEnv } from '$lib/server/config/env';
import { signupGateBefore } from '$lib/server/instance/signup-gate';
import { seedDemoProject } from '$lib/server/onboarding/seed';
import { PASSWORD_RESET_TTL_S } from './auth/constants';
import { dispatchResetMail } from './auth/send-reset-mail';

export function isOidcEnabled(): boolean {
	return Boolean(readEnv('OIDC_DISCOVERY_URL'))
		&& Boolean(readEnv('OIDC_CLIENT_ID'))
		&& Boolean(readEnv('OIDC_CLIENT_SECRET'));
}

function init() {
	const oidcConfig = isOidcEnabled()
		? [
				{
					providerId:   'oidc',
					clientId:     requireEnv('OIDC_CLIENT_ID'),
					clientSecret: requireEnv('OIDC_CLIENT_SECRET'),
					discoveryUrl: requireEnv('OIDC_DISCOVERY_URL')
				}
			]
		: [];

	return betterAuth({
		baseURL: readEnv('ORIGIN'),
		secret:  requireEnv('TRACE_AUTH_SECRET'),
		database: drizzleAdapter(db, { provider: 'pg' }),
		emailAndPassword: {
			enabled: true,
			resetPasswordTokenExpiresIn: PASSWORD_RESET_TTL_S,
			sendResetPassword: async ({ user, url }) => dispatchResetMail({ user, url }),
		},
		advanced: { database: { generateId: false } },
		user: {
			additionalFields: {
				role:       { type: 'string', input: false, returned: true },
				welcomedAt: { type: 'date',   input: false, returned: true },
			},
		},
		databaseHooks: {
			user: {
				create: {
					before: async (userData) => {
						const next = await signupGateBefore(userData as Record<string, unknown> & { email: string });
						return { data: next };
					},
					after: async (createdUser) => {
						const created = createdUser as { id: string; role?: string };
						if (created.role !== 'admin') return;
						try {
							await seedDemoProject(created.id);
						} catch (err) {
							console.error('demo seed failed (admin can re-seed from /settings/instance):', err);
						}
					},
				},
			},
		},
		plugins: [
			apiKey({ enableMetadata: true }),
			genericOAuth({ config: oidcConfig }),
			sveltekitCookies(getRequestEvent)
		]
	});
}

type Auth = ReturnType<typeof init>;

let cached: Auth | null = null;
function getAuth(): Auth {
	return (cached ??= init());
}

export const auth = new Proxy({} as Auth, {
	get(_target, prop, receiver) {
		const inst = getAuth();
		const value = Reflect.get(inst, prop, receiver);
		return typeof value === 'function' ? value.bind(inst) : value;
	}
});

export type Session = Auth['$Infer']['Session'];
