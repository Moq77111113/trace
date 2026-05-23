import { describe, it, expect } from 'vitest';
import { load } from '../../../src/routes/(app)/settings/instance/+layout.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantInstanceAdmin, mkUser } from '$testing/fixtures';

const userObj = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });
const evt = (u0: ReturnType<typeof userObj>) => ({ locals: { user: u0, authz: makeAuthorizer(u0) } } as unknown as Parameters<typeof load>[0]);

describe('instance layout guard', () => {
	it('403s a user without instance.administer, passes a granted user', async () => {
		const u = await mkUser(); const u0 = userObj(u.id);
		await expect(load(evt(u0))).rejects.toMatchObject({ status: 403 });
		await grantInstanceAdmin(u.id);
		await expect(load(evt(u0))).resolves.toBeDefined();
	});
});
