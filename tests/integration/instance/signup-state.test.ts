import { describe, it, expect } from 'vitest';
import { isSignupOpen } from '$lib/server/instance/signup-state';

const future = () => new Date(Date.now() + 60_000);
const past   = () => new Date(Date.now() - 60_000);

describe('isSignupOpen', () => {
	it('returns false when budget is zero', () => {
		expect(isSignupOpen({ signupBudget: 0, signupWindowEndsAt: null })).toBe(false);
		expect(isSignupOpen({ signupBudget: 0, signupWindowEndsAt: future() })).toBe(false);
	});

	it('returns true when budget is positive and no window is set', () => {
		expect(isSignupOpen({ signupBudget: 3, signupWindowEndsAt: null })).toBe(true);
	});

	it('returns true when budget is positive and window is in the future', () => {
		expect(isSignupOpen({ signupBudget: 1, signupWindowEndsAt: future() })).toBe(true);
	});

	it('returns false when budget is positive but window has elapsed', () => {
		expect(isSignupOpen({ signupBudget: 5, signupWindowEndsAt: past() })).toBe(false);
	});
});
