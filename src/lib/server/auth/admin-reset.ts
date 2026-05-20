import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user, adminResetLinks } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { PASSWORD_RESET_TTL_S } from './constants';
import { adminResetCtx } from './admin-reset-context';

export type MintInput = {
  targetUserId:   string;
  mintedByUserId: string;
  origin:         string;
};
export type MintOutput = { url: string; expiresAt: Date };

/** Mints a single-use reset URL for a target user without sending email. Writes an audit row. */
export async function mintAdminResetLink(input: MintInput): Promise<MintOutput> {
  const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, input.targetUserId));
  if (!target) throw new Error('admin reset: target user not found');

  const ctx = { capturedUrl: null as string | null };
  await adminResetCtx.run(ctx, async () => {
    await auth.api.requestPasswordReset({
      body: { email: target.email, redirectTo: '/reset-password' },
    });
  });
  if (!ctx.capturedUrl) {
    throw new Error('admin reset: sendResetPassword hook did not run');
  }

  // better-auth emits /api/auth/reset-password/<token>?callbackURL=...
  // We rebase it to the app's /reset-password/<token> route instead.
  const captured   = new URL(ctx.capturedUrl);
  const tokenSegment = captured.pathname.split('/').at(-1) ?? '';
  const final      = new URL(`/reset-password/${tokenSegment}`, input.origin);

  await db.insert(adminResetLinks).values({
    targetUserId:   input.targetUserId,
    mintedByUserId: input.mintedByUserId,
  });

  return {
    url:       final.toString(),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_S * 1000),
  };
}

export type AdminResetRow = {
  id:           string;
  targetEmail:  string;
  mintedAt:     Date;
  usedAt:       Date | null;
  expiresAt:    Date;
};

/** Last N admin-minted links, newest first, joined with target email. */
export async function listRecentAdminResets(limit: number): Promise<AdminResetRow[]> {
  const rows = await db
    .select({
      id:          adminResetLinks.id,
      targetEmail: user.email,
      mintedAt:    adminResetLinks.mintedAt,
      usedAt:      adminResetLinks.usedAt,
    })
    .from(adminResetLinks)
    .innerJoin(user, eq(user.id, adminResetLinks.targetUserId))
    .orderBy(desc(adminResetLinks.mintedAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    expiresAt: new Date(r.mintedAt.getTime() + PASSWORD_RESET_TTL_S * 1000),
  }));
}
