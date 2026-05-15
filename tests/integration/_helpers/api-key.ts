import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/client';
import { user } from '$lib/server/db/schema';

export async function createTestApiKey(projectId: string, name = 'test-ci') {
	const [u] = await db
		.insert(user)
		.values({
			name:  'Test User',
			email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@trace.test`,
		})
		.returning();

	if (!u) throw new Error('seed: user insert failed');

	const created = await auth.api.createApiKey({
		body: {
			name,
			userId:   u.id,
			prefix:   'crun_',
			metadata: { projectId },
		},
	});

	return { rawKey: created.key, userId: u.id };
}
