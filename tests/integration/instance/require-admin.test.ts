import { describe, it, expect } from 'vitest';
import { requireAdmin } from '$lib/server/instance/require-admin';

describe('requireAdmin', () => {
	it('throws when user is null', () => {
		expect(() => requireAdmin(null)).toThrow();
	});

	it('throws when role is "user"', () => {
		expect(() =>
			requireAdmin({ id: 'x', email: 'u@x', name: null, role: 'user' }),
		).toThrow();
	});

	it('returns the user when role is "admin"', () => {
		const u = { id: 'x', email: 'a@x', name: null, role: 'admin' as const };
		expect(requireAdmin(u)).toEqual(u);
	});
});
