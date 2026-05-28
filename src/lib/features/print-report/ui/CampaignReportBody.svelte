<script lang="ts">
  import ReportHeader  from './blocks/ReportHeader.svelte';
  import MembersTable  from './blocks/MembersTable.svelte';
  import RunReportBody from './RunReportBody.svelte';
  import type { ExecutionPageData } from '$lib/server/executions/read/queries';
  import type { CampaignScope } from '$lib/features/print-report/lib/scope';

  type MemberWithEvidence = {
    featureId:         string;
    code:              string;
    name:              string;
    required:          boolean;
    status:            string | null;
    latestExecutionId: string | null;
    evidence:          NonNullable<ExecutionPageData> | null;
  };

  type Props = {
    data: {
      campaign: { name: string; status: string; openedAt: Date | string; closedAt: Date | string | null };
      project:  { id: string; slug: string };
      progress: { requiredPassed: number; requiredTotal: number; optionalPassed: number; optionalTotal: number };
      members:  MemberWithEvidence[];
    };
    scope: CampaignScope;
  };
  let { data, scope }: Props = $props();

  const meta = $derived([
    { label: 'status',   value: data.campaign.status.toLowerCase() },
    { label: 'required', value: `${data.progress.requiredPassed} / ${data.progress.requiredTotal} passed` },
    { label: 'optional', value: `${data.progress.optionalPassed} / ${data.progress.optionalTotal} passed` },
    { label: 'opened',   value: new Date(data.campaign.openedAt).toLocaleDateString() },
    ...(data.campaign.closedAt ? [{ label: 'closed', value: new Date(data.campaign.closedAt).toLocaleDateString() }] : []),
  ]);

  const evidenceMembers = $derived(
    data.members.filter((m) => {
      if (!m.evidence) return false;
      if (scope === 'required') return m.required;
      if (scope === 'failed')   return m.status === 'FAILED';
      return true;
    }),
  );
</script>

<ReportHeader title={data.campaign.name} status={null} {meta} />
<MembersTable members={data.members} projectSlug={data.project.slug} />

{#each evidenceMembers as member (member.featureId)}
  {#if member.evidence}
    <section class="mt-6 pt-6 border-t border-border">
      <h2 class="text-[14px] font-semibold mb-3 flex items-center gap-2">
        <span class="font-mono text-[12px] text-ink-3 tabular-nums">{member.code}</span>
        <span>{member.name}</span>
      </h2>
      <RunReportBody data={member.evidence} scope="full" />
    </section>
  {/if}
{/each}
