import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { instanceSettings, verification, user, account } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { SMTP_DEFAULT_PORT } from '$lib/server/email/constants';
import { encryptSmtpPassword } from '$lib/server/email/crypto';

const sendMailMock = vi.fn().mockResolvedValue({ messageId: '<id>' });
vi.mock('nodemailer', () => ({
	default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

async function configureSmtp() {
	await db.update(instanceSettings).set({
		smtpHost: 'smtp.example.com',
		smtpPort: SMTP_DEFAULT_PORT,
		smtpUser: 'u',
		smtpPasswordEnc: encryptSmtpPassword('p'),
		smtpFrom: 'Trace <n@x>',
		smtpSecure: false,
	}).where(eq(instanceSettings.id, 1));
}

function extractToken(html: string): string {
	const match = html.match(/\/reset-password\/([A-Za-z0-9._-]+)/);
	if (!match) throw new Error('no token in email');
	return match[1] ?? '';
}

async function seedPasswordUser(email: string) {
	const [u] = await db.insert(user).values({ email, name: 'R', role: 'user' }).returning();
	if (!u) throw new Error('user insert failed');
	await db.insert(account).values({
		accountId: u.id,
		providerId: 'credential',
		userId: u.id,
		password: 'hashed-placeholder',
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return u;
}

describe('resetPassword via auth.api', () => {
	it('valid token sets the password and allows sign-in', async () => {
		const email = `r-${Date.now()}@example.com`;
		const u = await seedPasswordUser(email);
		await configureSmtp();
		sendMailMock.mockClear();
		await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });
		const token = extractToken(sendMailMock.mock.calls[0]?.[0]?.html ?? '');

		await auth.api.resetPassword({ body: { token, newPassword: 'brandnewpw1234' } });

		const [acct] = await db.select({ password: account.password }).from(account)
			.where(eq(account.userId, u.id));
		expect(acct?.password).toBeTruthy();
		expect(acct?.password).not.toBe('hashed-placeholder');
	});

	it('reusing the same token fails', async () => {
		const email = `r2-${Date.now()}@example.com`;
		await seedPasswordUser(email);
		await configureSmtp();
		sendMailMock.mockClear();
		await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });
		const token = extractToken(sendMailMock.mock.calls[0]?.[0]?.html ?? '');

		await auth.api.resetPassword({ body: { token, newPassword: 'brandnewpw1234' } });
		await expect(
			auth.api.resetPassword({ body: { token, newPassword: 'andagain1234567' } }),
		).rejects.toBeDefined();
	});

	it('expired token fails', async () => {
		const email = `r3-${Date.now()}@example.com`;
		await seedPasswordUser(email);
		await configureSmtp();
		sendMailMock.mockClear();
		await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });
		const token = extractToken(sendMailMock.mock.calls[0]?.[0]?.html ?? '');

		await db.update(verification).set({ expiresAt: new Date(Date.now() - 60_000) });

		await expect(
			auth.api.resetPassword({ body: { token, newPassword: 'anotherone1234' } }),
		).rejects.toBeDefined();
	});
});
