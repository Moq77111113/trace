import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { apiKey, genericOAuth } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db/client';

export const isOidcEnabled =
	Boolean(env.OIDC_DISCOVERY_URL) && Boolean(env.OIDC_CLIENT_ID) && Boolean(env.OIDC_CLIENT_SECRET);

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

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	advanced: { database: { generateId: false } },
	plugins: [
		apiKey({ enableMetadata: true }),
		genericOAuth({ config: oidcConfig }),
		sveltekitCookies(getRequestEvent)
	]
});

export type Session = typeof auth.$Infer.Session;
