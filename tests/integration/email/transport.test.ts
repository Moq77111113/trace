import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { instanceSettings } from '$lib/server/db/schema';
import { SMTP_DEFAULT_PORT } from '$lib/server/email/constants';
import { encryptSmtpPassword } from '$lib/server/email/crypto';
import { NotConfiguredError, sendMail, sendTestMail } from '$lib/server/email/transport';

const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: sendMailMock }),
  },
}));

beforeEach(async () => {
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: '<id@example>' });
  await db.update(instanceSettings).set({
    smtpHost: '', smtpPort: SMTP_DEFAULT_PORT, smtpUser: '', smtpPasswordEnc: '',
    smtpFrom: '', smtpSecure: false, smtpTestedAt: null,
  }).where(eq(instanceSettings.id, 1));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendMail', () => {
  it('throws NotConfiguredError when smtp_host is empty', async () => {
    await expect(
      sendMail({ to: 'x@example.com', subject: 's', text: 't', html: '<p>t</p>' })
    ).rejects.toBeInstanceOf(NotConfiguredError);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('calls nodemailer with decrypted creds and configured fields', async () => {
    await db.update(instanceSettings).set({
      smtpHost: 'smtp.example.com',
      smtpPort: 2525,
      smtpUser: 'noreply@example.com',
      smtpPasswordEnc: encryptSmtpPassword('hunter2'),
      smtpFrom: 'Trace <noreply@example.com>',
      smtpSecure: true,
    }).where(eq(instanceSettings.id, 1));

    await sendMail({ to: 'a@b.com', subject: 's', text: 't', html: '<p>t</p>' });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const args = sendMailMock.mock.calls[0]?.[0] as Record<string, string>;
    expect(args.from).toBe('Trace <noreply@example.com>');
    expect(args.to).toBe('a@b.com');
    expect(args.subject).toBe('s');
  });
});

describe('sendTestMail', () => {
  it('uses unsaved form values, does not read DB', async () => {
    await sendTestMail({
      host: 'unsaved.example.com', port: 1025, user: 'u', password: 'p',
      from: 'From <f@x>', secure: false, to: 'me@example.com',
    });
    const args = sendMailMock.mock.calls[0]?.[0] as Record<string, string>;
    expect(args.from).toBe('From <f@x>');
    expect(args.to).toBe('me@example.com');
    expect(args.subject).toMatch(/test/i);
  });
});
