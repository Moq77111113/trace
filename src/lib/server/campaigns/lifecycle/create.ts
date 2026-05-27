import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { campaigns } from '$lib/server/db/schema';
import { ok, err, type Result } from '$lib/shared/lib/result';
import { isUniqueViolation } from '$lib/server/db/errors';

/** Form-boundary schema for creating a campaign. */
export const createCampaignBody = z.object({
  name:       z.string().trim().min(1).max(120),
  appVersion: z.string().trim().min(1).max(60),
});

/** A persisted campaign row. */
export type Campaign = typeof campaigns.$inferSelect;

/** Inputs to {@link createCampaign}: the validated body plus the resolved owner context. */
export type CreateCampaignInput = z.infer<typeof createCampaignBody> & {
  projectId: string;
  createdBy: string;
};

/** Why a campaign could not be created. */
export type CreateCampaignError = 'name-taken' | 'open-version-conflict';

/** Outcome of {@link createCampaign}. */
export type CreateCampaignResult = Result<Campaign, CreateCampaignError>;

/** Creates an OPEN campaign. `err('open-version-conflict')` if an open campaign already targets `appVersion`; `err('name-taken')` if the name is taken in the project. */
export async function createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult> {
  try {
    const [row] = await db
      .insert(campaigns)
      .values({ projectId: input.projectId, name: input.name, appVersion: input.appVersion, createdBy: input.createdBy })
      .returning();
    if (!row) throw new Error('createCampaign: insert returned no row');
    return ok(row);
  } catch (e) {
    if (isUniqueViolation(e, 'campaigns_project_version_open_idx')) return err('open-version-conflict');
    if (isUniqueViolation(e, 'campaigns_project_name_idx')) return err('name-taken');
    throw e;
  }
}
