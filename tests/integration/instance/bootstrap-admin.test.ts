import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { bootstrapAdminFromEnv } from '$lib/server/instance/bootstrap-admin';
import { db } from '$lib/server/db/client';
import { user } from '$lib/server/db/schema';
import { resetInstance } from '$testing/integration/_helpers/reset-instance';

function uniqueEmail(prefix = 'b') {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@trace.test`;
}

async function seedUser(email: string, role: 'admin' | 'user' = 'user') {
	const [u] = await db.insert(user).values({ email, name: 'X', role }).returning();
	if (!u) throw new Error('seed failed');
	return u;
}

describe('bootstrapAdminFromEnv', () => {
	beforeEach(async () => {
		await resetInstance();
	});

	it('is a no-op when the env var is not set', async () => {
		const email = uniqueEmail();
		await seedUser(email, 'user');
		await bootstrapAdminFromEnv(undefined);
		const [u] = await db.select().from(user).where(eq(user.email, email));
		expect(u?.role).toBe('user');
	});

	it('is a no-op when no user matches the target email', async () => {
		await seedUser(uniqueEmail(), 'user');
		await bootstrapAdminFromEnv('missing@trace.test');
		const admins = (await db.select().from(user)).filter((u) => u.role === 'admin');
		expect(admins).toHaveLength(0);
	});

	it('promotes the matching user when no admin exists', async () => {
		const target = uniqueEmail('target');
		await seedUser(target, 'user');
		await bootstrapAdminFromEnv(target);
		const [u] = await db.select().from(user).where(eq(user.email, target));
		expect(u?.role).toBe('admin');
	});

	it('also promotes when another admin exists but the target is not yet admin', async () => {
		await seedUser(uniqueEmail('existing'), 'admin');
		const target = uniqueEmail('target');
		await seedUser(target, 'user');
		await bootstrapAdminFromEnv(target);
		const [u] = await db.select().from(user).where(eq(user.email, target));
		expect(u?.role).toBe('admin');
	});

	it('is idempotent — re-running leaves state unchanged', async () => {
		const target = uniqueEmail('target');
		await seedUser(target, 'user');
		await bootstrapAdminFromEnv(target);
		await bootstrapAdminFromEnv(target);
		const [u] = await db.select().from(user).where(eq(user.email, target));
		expect(u?.role).toBe('admin');
	});
});
