<script lang="ts">
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import EmptyState from '$lib/shared/ui/EmptyState.svelte';
  import Gate from '$lib/shared/authz/Gate.svelte';
  import CampaignHeader from '$lib/features/campaign-manager/ui/CampaignHeader.svelte';
  import MemberList from '$lib/features/campaign-manager/ui/MemberList.svelte';
  import AddMemberControl from '$lib/features/campaign-manager/ui/AddMemberControl.svelte';
  import ReportButton from '$lib/features/print-report/ui/ReportButton.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
  const locked = $derived(data.campaign.status === 'CLOSED');
</script>

<PageTitle title={data.campaign.name} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <div class="flex justify-end mb-2">
    <ReportButton
      href={`/p/${data.project.slug}/campaigns/${data.campaign.id}/report.html`}
      options={[
        { label: 'Full',          scope: null },
        { label: 'Required only', scope: 'required' },
        { label: 'Failures only', scope: 'failed' },
      ]}
    />
  </div>
  <CampaignHeader campaign={data.campaign} requiredPassed={data.progress.requiredPassed} requiredTotal={data.progress.requiredTotal} />

  {#if !locked}
    <Gate can="campaign.manage">
      <div class="mb-4">
        <AddMemberControl candidates={data.candidates} />
      </div>
    </Gate>
  {/if}

  {#if data.members.length === 0}
    <EmptyState title={m.campaign_no_features()} />
  {:else}
    <MemberList members={data.members} {locked} slug={data.project.slug} />
  {/if}
</div>
