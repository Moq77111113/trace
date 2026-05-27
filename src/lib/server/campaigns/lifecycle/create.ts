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

/** Creates an OPEN campaign under `projectId`. */
export async function createCampaign(input: CreateCampaignInput) {
  const [row] = await db
    .insert(campaigns)
    .values({ projectId: input.projectId, name: input.name, appVersion: input.appVersion, createdBy: input.createdBy })
    .returning();
  if (!row) throw new Error('createCampaign: insert returned no row');
  return row;
}
