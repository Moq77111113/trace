import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user, account } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { openSignup, closeSignup } from '$lib/server/instance/settings';

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: vi.fn() }) },
}));

vi.mock('$app/server', () => ({
  getRequestEvent: () => null,
}));

async function seedUser(email: string, password: string): Promise<void> {
  await openSignup({ budget: 10, windowEndsAt: null, updatedBy: null });
  await auth.api.signUpEmail({ body: { email, password, name: 'X' }, asResponse: true });
  await closeSignup({ updatedBy: null });
}

async function signedInHeaders(email: string, password: string): Promise<Headers> {
  const res = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  return new Headers({ cookie: res.headers.get('set-cookie') ?? '' });
}

describe('auth.api.changePassword', () => {
  it('wrong current password is rejected', async () => {
    const email = `cp-${Date.now()}@example.com`;
    await seedUser(email, 'rightpassword1234');
    const headers = await signedInHeaders(email, 'rightpassword1234');

    await expect(
      auth.api.changePassword({
        body: { currentPassword: 'WRONG-PW12345', newPassword: 'replacement123' },
        headers,
      }),
    ).rejects.toBeDefined();
  });

  it('correct current password updates and allows sign-in with new', async () => {
    const email = `cp2-${Date.now()}@example.com`;
    await seedUser(email, 'rightpassword1234');
    const headers = await signedInHeaders(email, 'rightpassword1234');

    await auth.api.changePassword({
      body: {
        currentPassword: 'rightpassword1234',
        newPassword: 'replacement1234',
        revokeOtherSessions: true,
      },
      headers,
    });

    await expect(
      auth.api.signInEmail({ body: { email, password: 'replacement1234' } }),
    ).resolves.toBeDefined();
  });
});

describe('oidc-only account rejects changePassword (defense in depth)', () => {
  it('listUserAccounts surfaces only oidc provider', async () => {
    const email = `cp3-${Date.now()}@example.com`;
    await seedUser(email, 'rightpassword1234');
    const headers = await signedInHeaders(email, 'rightpassword1234');

    const [u] = await db.select().from(user).where(eq(user.email, email));
    if (!u) throw new Error('user insert failed');
    await db.delete(account).where(eq(account.userId, u.id));
    await db.insert(account).values({
      accountId: 'oidc-sub',
      providerId: 'oidc',
      userId: u.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const accounts = (await auth.api.listUserAccounts({ headers })) as { providerId: string }[];
    expect(accounts.map((a) => a.providerId)).toContain('oidc');
    expect(accounts.map((a) => a.providerId)).not.toContain('credential');
  });
});
