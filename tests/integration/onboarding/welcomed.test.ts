import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user } from '$lib/server/db/schema';
import { dismissWelcome } from '$lib/server/onboarding/welcomed';

function uniqueEmail(prefix = 'w') {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@trace.test`;
}

async function seedUser() {
	const [u] = await db.insert(user).values({ email: uniqueEmail(), name: 'W' }).returning();
	if (!u) throw new Error('seed failed');
	return u;
}

describe('dismissWelcome', () => {
	it('sets welcomed_at on the user', async () => {
		const u = await seedUser();
		expect(u.welcomedAt).toBeNull();
		await dismissWelcome(u.id);
		const [after] = await db.select().from(user).where(eq(user.id, u.id));
		expect(after?.welcomedAt).not.toBeNull();
	});

	it('is idempotent — re-dismissing preserves the original timestamp', async () => {
		const u = await seedUser();
		await dismissWelcome(u.id);
		const [first] = await db.select().from(user).where(eq(user.id, u.id));
		await new Promise((r) => setTimeout(r, 10));
		await dismissWelcome(u.id);
		const [second] = await db.select().from(user).where(eq(user.id, u.id));
		expect(second?.welcomedAt?.getTime()).toBe(first?.welcomedAt?.getTime());
	});
});
