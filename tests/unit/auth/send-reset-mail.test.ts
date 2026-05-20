import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminResetCtx } from '$lib/server/auth/admin-reset-context';
import { adminResetCtx } from '$lib/server/auth/admin-reset-context';
import { dispatchResetMail } from '$lib/server/auth/send-reset-mail';

const sendMailMock = vi.fn();
vi.mock('$lib/server/db/client', () => ({ db: {} }));
vi.mock('$lib/server/db/schema', () => ({ account: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('$lib/server/email/transport', () => ({
  sendMail: (...args: unknown[]) => sendMailMock(...args),
  NotConfiguredError: class NotConfiguredError extends Error {
    readonly code = 'SMTP_NOT_CONFIGURED';
    constructor() {
      super('SMTP is not configured on this instance.');
      this.name = 'NotConfiguredError';
    }
  },
}));
vi.mock('$lib/server/email/messages', () => ({
  resetPasswordEmail: vi.fn(({ to }: { to: string }) => ({ to, subject: 'Reset', text: '', html: 'reset-password' })),
  oidcOnlyNudgeEmail: vi.fn(({ to }: { to: string }) => ({ to, subject: 'OIDC', text: '', html: 'oidc-nudge' })),
}));

const dbSelectMock = vi.fn();
vi.mock('$lib/server/db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => dbSelectMock() }) }),
  },
}));

const USER = { id: 'u1', email: 'alice@example.com', name: 'Alice' };

beforeEach(() => {
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: '<id>' });
  dbSelectMock.mockReset();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('dispatchResetMail', () => {
  it('admin-context set → captures URL, does not send mail', async () => {
    const ctx: AdminResetCtx = { capturedUrl: null };
    await adminResetCtx.run(ctx, async () => {
      await dispatchResetMail({ user: USER, url: 'https://example.com/reset?token=xyz' });
    });
    expect(ctx.capturedUrl).toBe('https://example.com/reset?token=xyz');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('password account → calls sendMail with reset email', async () => {
    dbSelectMock.mockResolvedValue([{ providerId: 'credential' }]);
    await dispatchResetMail({ user: USER, url: 'https://example.com/reset?token=abc' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0]?.[0] as { html: string };
    expect(mail.html).toContain('reset-password');
  });

  it('oidc-only account → calls sendMail with nudge email', async () => {
    dbSelectMock.mockResolvedValue([{ providerId: 'oidc' }]);
    await dispatchResetMail({ user: USER, url: 'https://example.com/reset?token=abc' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0]?.[0] as { html: string };
    expect(mail.html).toContain('oidc-nudge');
  });

  it('NotConfiguredError → logs no-smtp, does not throw', async () => {
    dbSelectMock.mockResolvedValue([{ providerId: 'credential' }]);
    const { NotConfiguredError } = await import('$lib/server/email/transport');
    sendMailMock.mockRejectedValue(new NotConfiguredError());
    await expect(dispatchResetMail({ user: USER, url: 'https://example.com/reset' })).resolves.toBeUndefined();
    expect(console.info).toHaveBeenCalledWith('[reset]', expect.objectContaining({ reason: 'no-smtp' }));
  });
});
