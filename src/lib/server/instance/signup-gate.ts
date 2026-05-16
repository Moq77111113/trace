import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user, instanceSettings } from '$lib/server/db/schema';
import { isSignupOpen } from './signup-state';

export class SignupClosedError extends Error {
	readonly code = 'SIGNUP_CLOSED';
	constructor() {
		super('Signup is closed on this Trace instance.');
		this.name = 'SignupClosedError';
	}
}

type UserBeforeCreate = Record<string, unknown> & { email: string };

export async function signupGateBefore(
	input: UserBeforeCreate,
): Promise<UserBeforeCreate & { role: 'admin' | 'user' }> {
	return db.transaction(async (tx) => {
		// Row-level lock on the singleton serializes every concurrent signup.
		await tx.execute(sql`SELECT 1 FROM "instance_settings" WHERE "id" = 1 FOR UPDATE`);

		const adminRows = await tx
			.select({ c: sql<number>`count(*)::int` })
			.from(user)
			.where(eq(user.role, 'admin'));
		const adminExists = (adminRows[0]?.c ?? 0) > 0;

		if (!adminExists) {
			return { ...input, role: 'admin' as const };
		}

		const [settings] = await tx
			.select()
			.from(instanceSettings)
			.where(eq(instanceSettings.id, 1));
		if (
			!settings ||
			!isSignupOpen({
				signupBudget:       settings.signupBudget,
				signupWindowEndsAt: settings.signupWindowEndsAt,
			})
		) {
			throw new SignupClosedError();
		}

		await tx
			.update(instanceSettings)
			.set({ signupBudget: settings.signupBudget - 1, updatedAt: new Date() })
			.where(eq(instanceSettings.id, 1));

		return { ...input, role: 'user' as const };
	});
}
