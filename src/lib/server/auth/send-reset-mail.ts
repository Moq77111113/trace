import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { account } from '$lib/server/db/schema';
import { sendMail, NotConfiguredError } from '../email/transport';
import { resetPasswordEmail, oidcOnlyNudgeEmail } from '../email/messages';
import { adminResetCtx } from './admin-reset-context';

type ResetMailArgs = { user: { id: string; email: string; name: string | null }; url: string };

/** Routes a better-auth reset-password event: captures URL in admin context, sends reset or OIDC-nudge email otherwise. */
export async function dispatchResetMail({ user, url }: ResetMailArgs): Promise<void> {
  const ctx = adminResetCtx.getStore();
  if (ctx) {
    ctx.capturedUrl = url;
    return;
  }

  const providerIds = await db
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, user.id))
    .then((rows) => rows.map((r) => r.providerId));

  const isOidcOnly = providerIds.length > 0 && !providerIds.includes('credential');

  const mail = isOidcOnly
    ? oidcOnlyNudgeEmail({
        to: user.email,
        name: user.name ?? null,
        provider: providerIds[0] ?? 'SSO',
      })
    : resetPasswordEmail({
        to: user.email,
        name: user.name ?? null,
        url,
      });

  const emailHash = createHash('sha256').update(user.email).digest('hex').slice(0, 12);
  try {
    await sendMail(mail);
    console.info('[reset]', { emailHash, kind: isOidcOnly ? 'oidc-only' : 'password', sent: true });
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      console.info('[reset]', { emailHash, kind: isOidcOnly ? 'oidc-only' : 'password', sent: false, reason: 'no-smtp' });
      return;
    }
    console.error('[reset]', { emailHash, kind: isOidcOnly ? 'oidc-only' : 'password', sent: false, reason: 'smtp-error' });
  }
}
