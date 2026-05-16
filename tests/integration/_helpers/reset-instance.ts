import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';

export async function resetInstance(): Promise<void> {
	await db.execute(sql`DELETE FROM "user" WHERE "role" = 'admin'`);
	await db.execute(
		sql`UPDATE "instance_settings" SET "signup_budget" = 0, "signup_window_ends_at" = NULL, "updated_by" = NULL WHERE "id" = 1`,
	);
}
