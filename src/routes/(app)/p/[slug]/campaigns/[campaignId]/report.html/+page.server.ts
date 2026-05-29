import { error } from '@sveltejs/kit';
import { getCampaignDetail } from '$lib/server/campaigns/read/queries';
import { requireCampaign } from '$lib/server/campaigns/authz';
import { requireProject } from '$lib/server/projects/authz';
import { loadExecutionPage } from '$lib/server/executions/read/queries';
import { parseCampaignScope } from '$lib/features/print-report/lib/scope';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, url, locals }) => {
  const project = await requireProject(locals.authz, params.slug, 'project.access');
  await requireCampaign(locals.authz, params.campaignId, 'project.access');

  const detail = await getCampaignDetail(params.campaignId);
  if (!detail)                                     throw error(404, 'Campaign not found');
  if (detail.campaign.projectId !== project.id)    throw error(404, 'Campaign not in this project');

  const members = await Promise.all(
    detail.members.map(async (m) => ({
      ...m,
      evidence: m.latestExecutionId ? await loadExecutionPage(m.latestExecutionId) : null,
    })),
  );

  return {
    campaign: detail.campaign,
    project:  { id: project.id, name: project.name, slug: project.slug },
    progress: detail.progress,
    members,
    scope:    parseCampaignScope(url.searchParams.get('scope')),
  };
}) satisfies PageServerLoad;
