import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user } from '$lib/server/db/schema';
import { signupGateBefore, SignupClosedError } from '$lib/server/instance/signup-gate';
import { openSignup, getInstanceSettings } from '$lib/server/instance/settings';
import { resetInstance } from '../_helpers/reset-instance';

function uniqueEmail(prefix = 'u') {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@trace.test`;
}

async function applyGateAndInsert(email: string) {
	const data = await signupGateBefore({ email, name: 'Test' });
	const [row] = await db.insert(user).values({ email, name: 'Test', role: data.role }).returning();
	if (!row) throw new Error('insert failed');
	return row;
}

describe('signup gate', () => {
	beforeEach(async () => {
		await resetInstance();
	});

	it('first signup on an empty instance becomes admin', async () => {
		const email = uniqueEmail('first');
		await applyGateAndInsert(email);
		const [u] = await db.select().from(user).where(eq(user.email, email));
		expect(u?.role).toBe('admin');
	});

	it('second signup is rejected when signup is closed', async () => {
		await applyGateAndInsert(uniqueEmail('first'));
		await expect(signupGateBefore({ email: uniqueEmail('second') })).rejects.toBeInstanceOf(
			SignupClosedError,
		);
	});

	it('second signup succeeds when budget is open, and decrements the budget', async () => {
		await applyGateAndInsert(uniqueEmail('first'));
		await openSignup({ budget: 2, windowEndsAt: null, updatedBy: null });

		await applyGateAndInsert(uniqueEmail('second'));
		const after1 = await getInstanceSettings();
		expect(after1.signupBudget).toBe(1);

		await applyGateAndInsert(uniqueEmail('third'));
		const after2 = await getInstanceSettings();
		expect(after2.signupBudget).toBe(0);

		await expect(signupGateBefore({ email: uniqueEmail('fourth') })).rejects.toBeInstanceOf(
			SignupClosedError,
		);
	});

	it('signup is rejected once the window has elapsed even if budget remains', async () => {
		await applyGateAndInsert(uniqueEmail('first'));
		await openSignup({ budget: 5, windowEndsAt: new Date(Date.now() + 50), updatedBy: null });
		await new Promise((r) => setTimeout(r, 100));
		await expect(signupGateBefore({ email: uniqueEmail('late') })).rejects.toBeInstanceOf(
			SignupClosedError,
		);
	});

	it('only the first user gets the admin role', async () => {
		const e1 = uniqueEmail('a');
		const e2 = uniqueEmail('b');
		await applyGateAndInsert(e1);
		await openSignup({ budget: 1, windowEndsAt: null, updatedBy: null });
		await applyGateAndInsert(e2);

		const [u1] = await db.select().from(user).where(eq(user.email, e1));
		const [u2] = await db.select().from(user).where(eq(user.email, e2));
		expect(u1?.role).toBe('admin');
		expect(u2?.role).toBe('user');
	});
});
