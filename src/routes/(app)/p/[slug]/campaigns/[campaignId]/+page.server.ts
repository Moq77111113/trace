import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { getCampaignDetail } from '$lib/server/campaigns/read/queries';
import { listFeatures } from '$lib/server/features/read/queries';
import { requireCampaign } from '$lib/server/campaigns/authz';
import { addMember, removeMember, setMemberRequired, reorderMembers } from '$lib/server/campaigns/lifecycle/members';
import { closeCampaign } from '$lib/server/campaigns/lifecycle/close';
import { startCampaignRun } from '$lib/server/campaigns/run';
import { resolveLiveExecutor } from '$lib/server/executions/executor';
import { stringFields } from '$lib/server/forms';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

type Params = { slug: string; campaignId: string };

const featureRef  = z.object({ featureId: z.uuid({ version: 'v7' }) });
const requiredRef = featureRef.extend({ required: z.enum(['true', 'false']) });

export const load = (async ({ params, parent, locals }) => {
  const { project, breadcrumbs } = await parent();
  await requireCampaign(locals.authz, params.campaignId, 'project.access');

  const detail = await getCampaignDetail(params.campaignId);
  if (!detail)                              throw error(404, 'campaign not found');
  if (detail.campaign.projectId !== project.id) throw error(404, 'campaign not in this project');

  const memberIds   = new Set(detail.members.map((mem) => mem.featureId));
  const allFeatures = await listFeatures(project.id);
  const candidates  = allFeatures.filter((f) => !memberIds.has(f.id)).map((f) => ({ id: f.id, label: f.name }));

  return {
    campaign:   detail.campaign,
    members:    detail.members,
    progress:   detail.progress,
    candidates,
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_campaigns(), href: `/p/${project.slug}/campaigns` },
      { label: detail.campaign.name },
    ),
  };
}) satisfies PageServerLoad;

async function manage(event: RequestEvent<Params>) {
  await requireCampaign(event.locals.authz, event.params.campaignId, 'campaign.manage');
}

function back(params: Params): never {
  throw redirect(303, `/p/${params.slug}/campaigns/${params.campaignId}`);
}

export const actions = {
  addFeature: async (event: RequestEvent<Params>) => {
    await manage(event);
    const parsed = featureRef.safeParse(stringFields(await event.request.formData()));
    if (!parsed.success) return fail(400, { error: 'invalid-input' });
    await addMember({ campaignId: event.params.campaignId, featureId: parsed.data.featureId });
    back(event.params);
  },

  removeFeature: async (event: RequestEvent<Params>) => {
    await manage(event);
    const parsed = featureRef.safeParse(stringFields(await event.request.formData()));
    if (!parsed.success) return fail(400, { error: 'invalid-input' });
    await removeMember({ campaignId: event.params.campaignId, featureId: parsed.data.featureId });
    back(event.params);
  },

  toggleRequired: async (event: RequestEvent<Params>) => {
    await manage(event);
    const parsed = requiredRef.safeParse(stringFields(await event.request.formData()));
    if (!parsed.success) return fail(400, { error: 'invalid-input' });
    await setMemberRequired({ campaignId: event.params.campaignId, featureId: parsed.data.featureId, required: parsed.data.required === 'true' });
    back(event.params);
  },

  reorder: async (event: RequestEvent<Params>) => {
    await manage(event);
    const orderedFeatureIds = (await event.request.formData()).getAll('order').filter((v): v is string => typeof v === 'string');
    await reorderMembers({ campaignId: event.params.campaignId, orderedFeatureIds });
    back(event.params);
  },

  startRun: async (event: RequestEvent<Params>) => {
    await requireCampaign(event.locals.authz, event.params.campaignId, 'execution.run');
    const parsed = featureRef.safeParse(stringFields(await event.request.formData()));
    if (!parsed.success) return fail(400, { error: 'invalid-input' });
    const executedBy = resolveLiveExecutor(event);
    let run;
    try {
      run = await startCampaignRun({ campaignId: event.params.campaignId, featureId: parsed.data.featureId, executedBy });
    } catch {
      return fail(409, { error: 'run-failed' });
    }
    throw redirect(303, `/p/${event.params.slug}/executions/${run.id}`);
  },

  close: async (event: RequestEvent<Params>) => {
    await manage(event);
    const closedBy = resolveLiveExecutor(event);
    await closeCampaign({ campaignId: event.params.campaignId, closedBy });
    back(event.params);
  },
} satisfies Actions;
