import { sql } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/client';
import { apikey } from '$lib/server/db/schema';

export type CiAuthResult = { tokenName: string; projectId: string };

const TOKEN_PREFIX = 'crun_';

function parseMetadata(raw: string | null): { projectId?: string } {
	if (!raw) return {};
	try {
		const v = JSON.parse(raw);
		return v && typeof v === 'object' ? v : {};
	} catch {
		return {};
	}
}

export async function authenticateCi(
	authorization: string | null,
	requestedProjectId: string
): Promise<CiAuthResult> {
	if (!authorization) throw new Error('Authorization header required');

	const [scheme, token] = authorization.split(' ');
	if (scheme !== 'Bearer' || !token) throw new Error('Bearer token required');

	const verified = await auth.api.verifyApiKey({ body: { key: token } });
	if (!verified?.valid || !verified.key) throw new Error('invalid API key');

	const meta = (verified.key.metadata ?? {}) as { projectId?: string };
	if (meta.projectId !== requestedProjectId) {
		throw new Error('API key not scoped to this project');
	}

	const name = verified.key.name?.trim() || 'ci';
	return { tokenName: name, projectId: requestedProjectId };
}

export type ApiKeyRow = {
	id: string;
	name: string;
	enabled: boolean;
	lastRequest: Date | null;
	createdAt: Date;
	expiresAt: Date | null;
	start: string | null;
	prefix: string | null;
};

export async function listApiKeys(projectId: string): Promise<ApiKeyRow[]> {
	const rows = await db
		.select({
			id: apikey.id,
			name: apikey.name,
			enabled: apikey.enabled,
			lastRequest: apikey.lastRequest,
			createdAt: apikey.createdAt,
			expiresAt: apikey.expiresAt,
			start: apikey.start,
			prefix: apikey.prefix,
			metadata: apikey.metadata
		})
		.from(apikey)
		.orderBy(sql`${apikey.createdAt} DESC`);

	return rows
		.filter((r) => parseMetadata(r.metadata).projectId === projectId)
		.map(({ metadata: _, ...rest }) => ({
			...rest,
			name: rest.name ?? 'unnamed',
			enabled: rest.enabled ?? true
		}));
}

export async function createApiKey(args: {
	projectId: string;
	name: string;
	userId: string;
	expiresAt: Date | null;
}): Promise<{ id: string; key: string }> {
	const expiresIn = args.expiresAt
		? Math.max(60, Math.floor((args.expiresAt.getTime() - Date.now()) / 1000))
		: undefined;

	const body = {
		name: args.name,
		userId: args.userId,
		prefix: TOKEN_PREFIX,
		metadata: { projectId: args.projectId },
		...(expiresIn !== undefined && { expiresIn })
	};

	const created = await auth.api.createApiKey({ body });

	return { id: created.id, key: created.key };
}

export async function revokeApiKey(id: string, projectId: string): Promise<void> {
	const [row] = await db.select({ metadata: apikey.metadata }).from(apikey).where(sql`${apikey.id} = ${id}`);
	if (!row) throw new Error('api key not found');
	if (parseMetadata(row.metadata).projectId !== projectId) {
		throw new Error('api key not scoped to this project');
	}

	await db.update(apikey).set({ enabled: false }).where(sql`${apikey.id} = ${id}`);
}

/**
 * Creates a new key sharing the old one's name + expiry window, then revokes
 * the old key. Returns the new raw secret in the same `{ id, key }` shape as
 * `createApiKey` so the UI's "shown once" banner is reused verbatim.
 */
export async function rotateApiKey(args: {
	id:        string;
	projectId: string;
	userId:    string;
}): Promise<{ id: string; key: string }> {
	const [row] = await db
		.select({ name: apikey.name, expiresAt: apikey.expiresAt, metadata: apikey.metadata })
		.from(apikey)
		.where(sql`${apikey.id} = ${args.id}`);
	if (!row) throw new Error('api key not found');
	if (parseMetadata(row.metadata).projectId !== args.projectId) {
		throw new Error('api key not scoped to this project');
	}

	const created = await createApiKey({
		projectId: args.projectId,
		name:      row.name ?? 'rotated',
		userId:    args.userId,
		expiresAt: row.expiresAt ?? null,
	});

	await db.update(apikey).set({ enabled: false }).where(sql`${apikey.id} = ${args.id}`);

	return created;
}
