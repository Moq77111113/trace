import nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { instanceSettings } from '$lib/server/db/schema';
import { decryptSmtpPassword } from './crypto';
import { SMTP_CONNECT_TIMEOUT_MS } from './constants';

export class NotConfiguredError extends Error {
  readonly code = 'SMTP_NOT_CONFIGURED';
  constructor() {
    super('SMTP is not configured on this instance.');
    this.name = 'NotConfiguredError';
  }
}

export type OutboundMail = { to: string; subject: string; text: string; html: string };
export type TestMailInput = {
  host: string; port: number; user: string; password: string;
  from: string; secure: boolean; to: string;
};

type TransporterOpts = {
  host: string; port: number; user: string; password: string;
  from: string; secure: boolean;
};

function buildTransporter(opts: TransporterOpts) {
  return nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: opts.user ? { user: opts.user, pass: opts.password } : undefined,
    connectionTimeout: SMTP_CONNECT_TIMEOUT_MS,
  });
}

/** Sends an outbound mail using the persisted SMTP configuration; throws NotConfiguredError when unconfigured. */
export async function sendMail(mail: OutboundMail): Promise<{ messageId: string }> {
  const [row] = await db.select().from(instanceSettings).where(eq(instanceSettings.id, 1));
  if (!row || !row.smtpHost) throw new NotConfiguredError();
  const password = decryptSmtpPassword(row.smtpPasswordEnc);
  const tx = buildTransporter({
    host: row.smtpHost,
    port: row.smtpPort,
    user: row.smtpUser,
    password,
    from: row.smtpFrom,
    secure: row.smtpSecure,
  });
  const info = await tx.sendMail({ from: row.smtpFrom, ...mail });
  return { messageId: String(info.messageId ?? '') };
}

/** Sends a test mail using unsaved form values without reading the database. */
export async function sendTestMail(input: TestMailInput): Promise<{ messageId: string }> {
  const tx = buildTransporter(input);
  const info = await tx.sendMail({
    from: input.from,
    to: input.to,
    subject: 'trace · SMTP test',
    text: 'If you can read this, your SMTP configuration works.',
    html: '<p>If you can read this, your SMTP configuration works.</p>',
  });
  return { messageId: String(info.messageId ?? '') };
}
