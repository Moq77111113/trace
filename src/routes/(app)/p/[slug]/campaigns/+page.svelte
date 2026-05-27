<script lang="ts">
  import Gate from '$lib/shared/authz/Gate.svelte';
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import EmptyState from '$lib/shared/ui/EmptyState.svelte';
  import CampaignList from '$lib/features/campaign-manager/ui/CampaignList.svelte';
  import CampaignForm from '$lib/features/campaign-manager/ui/CampaignForm.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<PageTitle title={m.page_title_campaigns()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <header class="flex items-end justify-between gap-4 mb-4 max-md:flex-col max-md:items-stretch">
    <h1 class="text-[20px] font-semibold tracking-tight">{m.nav_campaigns()}</h1>
    <Gate can="campaign.manage">
      <CampaignForm />
    </Gate>
  </header>

  {#if data.campaigns.length === 0}
    <EmptyState title={m.campaign_empty()} />
  {:else}
    <CampaignList slug={data.project.slug} campaigns={data.campaigns} />
  {/if}
</div>
