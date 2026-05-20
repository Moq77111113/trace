import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { instanceSettings } from '$lib/server/db/schema';
import { SMTP_DEFAULT_PORT } from '$lib/server/email/constants';
import { decryptSmtpPassword } from '$lib/server/email/crypto';
import { getSmtp, updateSmtp } from '$lib/server/instance/settings';

describe('instance_settings smtp columns', () => {
  beforeEach(async () => {
    await db.update(instanceSettings).set({
      smtpHost: '', smtpPort: SMTP_DEFAULT_PORT, smtpUser: '', smtpPasswordEnc: '',
      smtpFrom: '', smtpSecure: false, smtpTestedAt: null,
    }).where(eq(instanceSettings.id, 1));
  });

  it('defaults are stored on the singleton', async () => {
    const [row] = await db.select().from(instanceSettings).where(eq(instanceSettings.id, 1));
    expect(row).toBeTruthy();
    expect(row?.smtpHost).toBe('');
    expect(row?.smtpPort).toBe(SMTP_DEFAULT_PORT);
    expect(row?.smtpSecure).toBe(false);
    expect(row?.smtpTestedAt).toBeNull();
  });
});

describe('updateSmtp', () => {
  beforeEach(async () => {
    await db.update(instanceSettings).set({
      smtpHost: '', smtpPort: SMTP_DEFAULT_PORT, smtpUser: '', smtpPasswordEnc: '',
      smtpFrom: '', smtpSecure: false, smtpTestedAt: null,
    }).where(eq(instanceSettings.id, 1));
  });

  it('writes all fields when changePassword is true', async () => {
    await updateSmtp({
      host: 'h', port: 2525, user: 'u', password: 'secret',
      from: 'f@x', secure: true, changePassword: true, updatedBy: null,
    });
    const row = await getSmtp();
    expect(row.smtpHost).toBe('h');
    expect(row.smtpPort).toBe(2525);
    expect(row.smtpSecure).toBe(true);
    expect(decryptSmtpPassword(row.smtpPasswordEnc)).toBe('secret');
  });

  it('preserves existing encrypted password when changePassword is false', async () => {
    await updateSmtp({
      host: 'h1', port: 587, user: 'u', password: 'first',
      from: 'f@x', secure: false, changePassword: true, updatedBy: null,
    });
    const before = await getSmtp();
    await updateSmtp({
      host: 'h2', port: 465, user: 'u2', password: '',
      from: 'g@x', secure: true, changePassword: false, updatedBy: null,
    });
    const after = await getSmtp();
    expect(after.smtpPasswordEnc).toBe(before.smtpPasswordEnc);
    expect(after.smtpHost).toBe('h2');
    expect(after.smtpPort).toBe(465);
  });
});
