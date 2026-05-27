import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { listCampaignsForProject } from '$lib/server/campaigns/read/queries';
import { createCampaign, createCampaignBody } from '$lib/server/campaigns/lifecycle/create';
import { requireProject } from '$lib/server/projects/authz';
import { resolveLiveExecutor } from '$lib/server/executions/executor';
import { stringFields } from '$lib/server/forms';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

type Params = { slug: string };

export const load = (async ({ parent }) => {
  const { project, breadcrumbs } = await parent();
  const campaigns = await listCampaignsForProject(project.id);
  return { campaigns, breadcrumbs: appendCrumb(breadcrumbs, { label: m.nav_campaigns() }) };
}) satisfies PageServerLoad;

export const actions = {
  create: async (event: RequestEvent<Params>) => {
    const project = await requireProject(event.locals.authz, event.params.slug, 'campaign.manage');
    const parsed = createCampaignBody.safeParse(stringFields(await event.request.formData()));
    if (!parsed.success) return fail(400, { error: 'invalid-input' });

    const createdBy = resolveLiveExecutor(event);
    const result = await createCampaign({ ...parsed.data, projectId: project.id, createdBy });
    if (!result.ok) return fail(409, { error: result.error });

    throw redirect(303, `/p/${event.params.slug}/campaigns/${result.value.id}`);
  },
};
