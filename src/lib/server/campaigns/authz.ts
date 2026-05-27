import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { campaigns } from '$lib/server/db/schema';
import type { Action } from '$lib/server/authz/actions';
import type { Authorizer } from '$lib/server/authz/authorizer';

/** Resolves a campaign by id and authorizes `action` on its `[project, instance]` chain; throws 404 if absent, 403 if not allowed. */
export async function requireCampaign(authz: Authorizer, id: string, action: Action) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) throw error(404, 'Campaign not found');
  await authz.authorize(action, [{ kind: 'project', id: campaign.projectId }, { kind: 'instance' }]);
  return campaign;
}
