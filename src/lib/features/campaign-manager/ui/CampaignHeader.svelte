<script lang="ts">
  import Badge from '$lib/shared/ui/Badge.svelte';
  import Button from '$lib/shared/ui/Button.svelte';
  import Gate from '$lib/shared/authz/Gate.svelte';
  import CampaignProgress from './CampaignProgress.svelte';
  import CloseCampaignModal from './CloseCampaignModal.svelte';
  import * as m from '$lib/paraglide/messages';

  type Campaign = {
    name: string;
    appVersion: string;
    status: 'OPEN' | 'CLOSED';
    outcome: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | null;
  };
  type Props = { campaign: Campaign; requiredPassed: number; requiredTotal: number };
  let { campaign, requiredPassed, requiredTotal }: Props = $props();

  let closeOpen = $state(false);
</script>

<header class="flex items-start justify-between gap-4 mb-5 max-md:flex-col">
  <div>
    <h1 class="text-[20px] font-semibold tracking-tight">{campaign.name}</h1>
    <div class="text-[12px] text-ink-3 font-mono mt-0.5">{campaign.appVersion}</div>
  </div>

  <div class="flex items-center gap-3">
    <CampaignProgress {requiredPassed} {requiredTotal} />
    {#if campaign.status === 'OPEN'}
      <Badge variant="running" glyph={false}>{m.campaign_status_open()}</Badge>
      <Gate can="campaign.manage">
        <Button variant="danger" onclick={() => (closeOpen = true)}>{m.campaign_close()}</Button>
      </Gate>
    {:else if campaign.outcome === 'PASSED'}
      <Badge variant="passed">{m.campaign_outcome_passed()}</Badge>
    {:else if campaign.outcome === 'INCONCLUSIVE'}
      <Badge variant="neutral" glyph={false}>{m.campaign_outcome_inconclusive()}</Badge>
    {:else}
      <Badge variant="failed">{m.campaign_outcome_failed()}</Badge>
    {/if}
  </div>
</header>

{#if campaign.status === 'OPEN'}
  <CloseCampaignModal open={closeOpen} onOpenChange={(v) => (closeOpen = v)} />
{/if}
