import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { apiKey, genericOAuth } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db/client';
import { signupGateBefore } from '$lib/server/instance/signup-gate';
import { seedDemoProject } from '$lib/server/onboarding/seed';

export const isOidcEnabled =
	Boolean(env.OIDC_DISCOVERY_URL) && Boolean(env.OIDC_CLIENT_ID) && Boolean(env.OIDC_CLIENT_SECRET);

function readAuthSecret(): string {
	if (env.TRACE_AUTH_SECRET) return env.TRACE_AUTH_SECRET;
	if (env.BETTER_AUTH_SECRET) {
		console.warn(
			'[auth] BETTER_AUTH_SECRET is deprecated and will be removed in a future release; rename it to TRACE_AUTH_SECRET.'
		);
		return env.BETTER_AUTH_SECRET;
	}
	throw new Error('TRACE_AUTH_SECRET is not set');
}

function init() {
	const oidcConfig = isOidcEnabled
		? [
				{
					providerId: 'oidc',
					clientId: env.OIDC_CLIENT_ID!,
					clientSecret: env.OIDC_CLIENT_SECRET!,
					discoveryUrl: env.OIDC_DISCOVERY_URL!
				}
			]
		: [];

	return betterAuth({
		baseURL: env.ORIGIN,
		secret: readAuthSecret(),
		database: drizzleAdapter(db, { provider: 'pg' }),
		emailAndPassword: { enabled: true },
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
