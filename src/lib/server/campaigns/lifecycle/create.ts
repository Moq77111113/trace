import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { campaigns } from '$lib/server/db/schema';

/** Form-boundary schema for creating a campaign. */
export const createCampaignBody = z.object({
  name:       z.string().trim().min(1).max(120),
  appVersion: z.string().trim().min(1).max(60),
});

/** Inputs to {@link createCampaign}: the validated body plus the resolved owner context. */
export type CreateCampaignInput = z.infer<typeof createCampaignBody> & {
  projectId: string;
  createdBy: string;
};

/** Creates an OPEN campaign under `projectId`. Throws 409 if an open campaign already targets `appVersion`. */
export async function createCampaign(input: CreateCampaignInput) {
  const [open] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(
      eq(campaigns.projectId, input.projectId),
      eq(campaigns.appVersion, input.appVersion),
      eq(campaigns.status, 'OPEN'),
    ));
  if (open) throw error(409, `An open campaign already targets version ${input.appVersion}`);

  const [row] = await db
    .insert(campaigns)
    .values({ projectId: input.projectId, name: input.name, appVersion: input.appVersion, createdBy: input.createdBy })
    .returning();
  if (!row) throw new Error('createCampaign: insert returned no row');
  return row;
}
