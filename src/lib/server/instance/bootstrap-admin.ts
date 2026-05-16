import { eq, ne, and } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user } from '$lib/server/db/schema';

export async function bootstrapAdminFromEnv(bootstrapEmail: string | undefined): Promise<void> {
	if (!bootstrapEmail) return;

	const [target] = await db.select().from(user).where(eq(user.email, bootstrapEmail));
	if (!target) return;
	if (target.role === 'admin') return;

	await db
		.update(user)
		.set({ role: 'admin' })
		.where(and(eq(user.id, target.id), ne(user.role, 'admin')));
}
