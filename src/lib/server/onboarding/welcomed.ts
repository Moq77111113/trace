import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user } from '$lib/server/db/schema';

export async function dismissWelcome(userId: string): Promise<void> {
	await db
		.update(user)
		.set({ welcomedAt: new Date() })
		.where(and(eq(user.id, userId), isNull(user.welcomedAt)));
}
