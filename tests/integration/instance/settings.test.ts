import { describe, it, expect, beforeEach } from 'vitest';
import { getInstanceSettings, openSignup, closeSignup } from '$lib/server/instance/settings';
import { resetInstance } from '../_helpers/reset-instance';

describe('instance settings', () => {
	beforeEach(async () => {
		await resetInstance();
	});

	it('returns the seeded singleton with budget=0 by default', async () => {
		const s = await getInstanceSettings();
		expect(s.signupBudget).toBe(0);
		expect(s.signupWindowEndsAt).toBeNull();
	});

	it('openSignup sets budget and optional window', async () => {
		await openSignup({ budget: 3, windowEndsAt: new Date(Date.now() + 3_600_000), updatedBy: null });
		const s = await getInstanceSettings();
		expect(s.signupBudget).toBe(3);
		expect(s.signupWindowEndsAt).not.toBeNull();
	});

	it('openSignup with no window clears any previous window', async () => {
		await openSignup({ budget: 5, windowEndsAt: new Date(Date.now() + 1000), updatedBy: null });
		await openSignup({ budget: 2, windowEndsAt: null, updatedBy: null });
		const s = await getInstanceSettings();
		expect(s.signupBudget).toBe(2);
		expect(s.signupWindowEndsAt).toBeNull();
	});

	it('closeSignup zeroes the budget and clears the window', async () => {
		await openSignup({ budget: 10, windowEndsAt: new Date(Date.now() + 1000), updatedBy: null });
		await closeSignup({ updatedBy: null });
		const s = await getInstanceSettings();
		expect(s.signupBudget).toBe(0);
		expect(s.signupWindowEndsAt).toBeNull();
	});

	it('rejects non-positive budget', async () => {
		await expect(openSignup({ budget: 0, windowEndsAt: null, updatedBy: null })).rejects.toThrow();
		await expect(openSignup({ budget: -1, windowEndsAt: null, updatedBy: null })).rejects.toThrow();
	});
});
