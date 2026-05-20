import * as m from '$lib/paraglide/messages';
import { PASSWORD_RESET_TTL_MIN } from '$lib/server/auth/constants';

export type Mail = { to: string; subject: string; text: string; html: string };
export type ResetInput = { to: string; name: string | null; url: string };
export type OidcNudgeInput = { to: string; name: string | null; provider: string };

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Builds a password-reset email for a credential account. */
export function resetPasswordEmail({ to, name, url }: ResetInput): Mail {
  const greeting = escapeHtml(name ?? to.split('@')[0] ?? to);
  const safeUrl = escapeHtml(url);
  return {
    to,
    subject: m.email_reset_subject(),
    text: `Hi ${name ?? ''},

Click the link below to reset your trace password. It is valid for ${PASSWORD_RESET_TTL_MIN} minutes.

${url}

If you did not request this, you can ignore this email.`,
    html: `<p>Hi ${greeting},</p>
<p>Click the link below to reset your trace password. It is valid for ${PASSWORD_RESET_TTL_MIN} minutes.</p>
<p><a href="${safeUrl}">${safeUrl}</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
  };
}

/** Builds a nudge email for accounts that can only sign in via OIDC. */
export function oidcOnlyNudgeEmail({ to, name, provider }: OidcNudgeInput): Mail {
  const greeting = escapeHtml(name ?? to.split('@')[0] ?? to);
  const safeProvider = escapeHtml(provider);
  return {
    to,
    subject: m.email_reset_oidc_subject({ provider }),
    text: `Hi ${name ?? ''},

Your trace account signs in with ${provider}. There is no password to reset.
Use the "Continue with SSO" button on the sign-in page.`,
    html: `<p>Hi ${greeting},</p>
<p>Your trace account signs in with <strong>${safeProvider}</strong>. There is no password to reset.</p>
<p>Use the "Continue with SSO" button on the sign-in page.</p>`,
  };
}
