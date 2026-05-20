import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { instanceSettings, user, account } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { SMTP_DEFAULT_PORT } from '$lib/server/email/constants';
import { encryptSmtpPassword } from '$lib/server/email/crypto';

const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

async function configureSmtp() {
  await db.update(instanceSettings).set({
    smtpHost: 'smtp.example.com',
    smtpPort: SMTP_DEFAULT_PORT,
    smtpUser: 'u',
    smtpPasswordEnc: encryptSmtpPassword('p'),
    smtpFrom: 'Trace <noreply@example.com>',
    smtpSecure: false,
  }).where(eq(instanceSettings.id, 1));
}

async function unconfigureSmtp() {
  await db.update(instanceSettings).set({ smtpHost: '' }).where(eq(instanceSettings.id, 1));
}

async function seedPasswordUser(email: string) {
  const [u] = await db.insert(user).values({ email, name: 'Test', role: 'user' }).returning();
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

beforeEach(() => {
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: '<id>' });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /request-password-reset (via auth.api.requestPasswordReset)', () => {
  it('password account + smtp set → sends reset email', async () => {
    const email = `pwd-${Date.now()}@example.com`;
    await seedPasswordUser(email);
    await configureSmtp();

    await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const args = sendMailMock.mock.calls[0]?.[0] as Record<string, string>;
    expect(args.subject).toBeTruthy();
    expect(args.html).toMatch(/reset-password/);
  });

  it('account does not exist → no mail, returns 200 generic', async () => {
    await configureSmtp();
    await auth.api.requestPasswordReset({
      body: { email: `nobody-${Date.now()}@example.com`, redirectTo: '/reset-password' },
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('smtp unconfigured → no mail, no throw', async () => {
    const email = `nosmtp-${Date.now()}@example.com`;
    await seedPasswordUser(email);
    await unconfigureSmtp();

    await expect(
      auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } }),
    ).resolves.toBeDefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('oidc-only account + smtp set → sends nudge email with no token', async () => {
    const email = `oidc-${Date.now()}@example.com`;
    const [u] = await db.insert(user).values({ email, name: 'Test', role: 'user' }).returning();
    if (!u) throw new Error('user insert failed');
    await db.insert(account).values({
      accountId: 'oidc-subject',
      providerId: 'oidc',
      userId: u.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await configureSmtp();
    await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const args = sendMailMock.mock.calls[0]?.[0] as Record<string, string>;
    expect(args.html).not.toMatch(/reset-password/);
    expect(args.html).toMatch(/oidc/i);
  });
});
