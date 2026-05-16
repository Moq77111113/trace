import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { instanceSettings } from '$lib/server/db/schema';

const SINGLETON_ID = 1;

export type InstanceSettings = {
	signupBudget: number;
	signupWindowEndsAt: Date | null;
	updatedAt: Date;
	updatedBy: string | null;
};

export async function getInstanceSettings(): Promise<InstanceSettings> {
	const [row] = await db.select().from(instanceSettings).where(eq(instanceSettings.id, SINGLETON_ID));
	if (!row) throw new Error('instance_settings singleton row missing — migration not applied');
	return {
		signupBudget:       row.signupBudget,
		signupWindowEndsAt: row.signupWindowEndsAt,
		updatedAt:          row.updatedAt,
		updatedBy:          row.updatedBy,
	};
}

export type OpenSignupInput = {
	budget: number;
	windowEndsAt: Date | null;
	updatedBy: string | null;
};

export async function openSignup({ budget, windowEndsAt, updatedBy }: OpenSignupInput): Promise<void> {
	if (!Number.isInteger(budget) || budget <= 0) {
		throw new Error('signup budget must be a positive integer');
	}
	await db
		.update(instanceSettings)
		.set({ signupBudget: budget, signupWindowEndsAt: windowEndsAt, updatedAt: new Date(), updatedBy })
		.where(eq(instanceSettings.id, SINGLETON_ID));
}

export async function closeSignup({ updatedBy }: { updatedBy: string | null }): Promise<void> {
	await db
		.update(instanceSettings)
		.set({ signupBudget: 0, signupWindowEndsAt: null, updatedAt: new Date(), updatedBy })
		.where(eq(instanceSettings.id, SINGLETON_ID));
}
