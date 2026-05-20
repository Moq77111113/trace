import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { instanceSettings } from '$lib/server/db/schema';
import { encryptSmtpPassword } from '$lib/server/email/crypto';

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

export type SmtpRow = {
	smtpHost: string;
	smtpPort: number;
	smtpUser: string;
	smtpPasswordEnc: string;
	smtpFrom: string;
	smtpSecure: boolean;
	smtpTestedAt: Date | null;
};

export async function getSmtp(): Promise<SmtpRow> {
	const [row] = await db.select().from(instanceSettings).where(eq(instanceSettings.id, SINGLETON_ID));
	if (!row) throw new Error('instance_settings singleton row missing');
	return {
		smtpHost:       row.smtpHost,
		smtpPort:       row.smtpPort,
		smtpUser:       row.smtpUser,
		smtpPasswordEnc: row.smtpPasswordEnc,
		smtpFrom:       row.smtpFrom,
		smtpSecure:     row.smtpSecure,
		smtpTestedAt:   row.smtpTestedAt,
	};
}

export type UpdateSmtpInput = {
	host: string;
	port: number;
	user: string;
	password: string;
	from: string;
	secure: boolean;
	changePassword: boolean;
	updatedBy: string | null;
};

export async function updateSmtp(input: UpdateSmtpInput): Promise<void> {
	if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65_535) {
		throw new Error('smtp port must be an integer between 1 and 65535');
	}
	const patch: Record<string, unknown> = {
		smtpHost:  input.host,
		smtpPort:  input.port,
		smtpUser:  input.user,
		smtpFrom:  input.from,
		smtpSecure: input.secure,
		updatedAt: new Date(),
		updatedBy: input.updatedBy,
	};
	if (input.changePassword) {
		patch.smtpPasswordEnc = input.password ? encryptSmtpPassword(input.password) : '';
	}
	await db.update(instanceSettings).set(patch).where(eq(instanceSettings.id, SINGLETON_ID));
}

export async function markSmtpTested(updatedBy: string | null): Promise<void> {
	await db
		.update(instanceSettings)
		.set({ smtpTestedAt: new Date(), updatedAt: new Date(), updatedBy })
		.where(eq(instanceSettings.id, SINGLETON_ID));
}
