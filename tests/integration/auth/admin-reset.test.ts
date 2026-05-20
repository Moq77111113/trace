import { describe, it, expect, vi } from 'vitest';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user, account, adminResetLinks } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { mintAdminResetLink, listRecentAdminResets } from '$lib/server/auth/admin-reset';
import { PASSWORD_RESET_TTL_S } from '$lib/server/auth/constants';

vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: vi.fn() }) } }));
vi.mock('$app/server', () => ({ getRequestEvent: () => null }));

async function makeUsers() {
  const stamp = Date.now();
  const adminEmail  = `admin-${stamp}@example.com`;
  const targetEmail = `target-${stamp}@example.com`;
  const [admin]  = await db.insert(user).values({ email: adminEmail,  name: 'A', role: 'admin' }).returning();
  const [target] = await db.insert(user).values({ email: targetEmail, name: 'T', role: 'user'  }).returning();
  if (!admin || !target) throw new Error('user seed failed');
  await db.insert(account).values({
    accountId: target.id, providerId: 'credential', userId: target.id,
    password: 'hashed-placeholder', createdAt: new Date(), updatedAt: new Date(),
  });
  return { admin, target };
}

describe('mintAdminResetLink', () => {
  it('returns a url with token and records an audit row', async () => {
    const { admin, target } = await makeUsers();
    const result = await mintAdminResetLink({
      targetUserId:   target.id,
      mintedByUserId: admin.id,
      origin:         'https://trace.example.com',
    });
    expect(result.url).toMatch(/^https:\/\/trace\.example\.com\/reset-password\//);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(PASSWORD_RESET_TTL_S * 1000 + 5_000);

    const [row] = await db.select().from(adminResetLinks)
      .where(and(eq(adminResetLinks.targetUserId, target.id), eq(adminResetLinks.mintedByUserId, admin.id)))
      .orderBy(desc(adminResetLinks.mintedAt))
      .limit(1);
    expect(row).toBeTruthy();
    expect(row?.usedAt).toBeNull();
  });

  it('the returned token actually resets the password', async () => {
    const { admin, target } = await makeUsers();
    const { url } = await mintAdminResetLink({
      targetUserId:   target.id,
      mintedByUserId: admin.id,
      origin:         'https://trace.example.com',
    });
    const tokenMatch = url.match(/\/reset-password\/([A-Za-z0-9._-]+)/);
    if (!tokenMatch) throw new Error('no token in url');
    const token = tokenMatch[1] ?? '';
    const newPw = 'admin-set-pw1234';
    await auth.api.resetPassword({ body: { token, newPassword: newPw } });

    const [acct] = await db.select({ password: account.password }).from(account)
      .where(eq(account.userId, target.id));
    expect(acct?.password).toBeTruthy();
    expect(acct?.password).not.toBe('hashed-placeholder');
  });

  it('throws when target user does not exist', async () => {
    await expect(
      mintAdminResetLink({
        targetUserId:   '00000000-0000-0000-0000-000000000000',
        mintedByUserId: '00000000-0000-0000-0000-000000000000',
        origin:         'https://x',
      }),
    ).rejects.toThrow(/not found/i);
  });
});

describe('listRecentAdminResets', () => {
  it('returns rows joined with target email, newest first', async () => {
    const { admin, target } = await makeUsers();
    await mintAdminResetLink({
      targetUserId: target.id, mintedByUserId: admin.id, origin: 'https://x',
    });
    const rows = await listRecentAdminResets(5);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.targetEmail).toBe(target.email);
    expect(rows[0]?.usedAt).toBeNull();
    expect(rows[0]?.expiresAt.getTime()).toBeGreaterThan(rows[0]?.mintedAt.getTime() ?? 0);
  });
});
