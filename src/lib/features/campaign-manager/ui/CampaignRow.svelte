<script lang="ts" module>
  export type CampaignRowData = {
    id: string;
    name: string;
    appVersion: string;
    status: 'OPEN' | 'CLOSED';
    outcome: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | null;
    progress: { requiredPassed: number; requiredTotal: number };
  };
</script>

<script lang="ts">
  import Badge from '$lib/shared/ui/Badge.svelte';
  import CampaignProgress from './CampaignProgress.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = { slug: string; campaign: CampaignRowData };
  let { slug, campaign }: Props = $props();
</script>

<a
  href="/p/{slug}/campaigns/{campaign.id}"
  class="flex items-center gap-4 rounded-md border border-border bg-surface px-4 py-3 hover:border-border-strong hover:bg-surface-2"
>
  <div class="min-w-0 flex-1">
    <div class="truncate text-[13.5px] font-medium text-ink">{campaign.name}</div>
    <div class="font-mono text-[12px] text-ink-3">{campaign.appVersion}</div>
  </div>

  <CampaignProgress
    requiredPassed={campaign.progress.requiredPassed}
    requiredTotal={campaign.progress.requiredTotal}
  />

  {#if campaign.status === 'OPEN'}
    <Badge variant="running" glyph={false}>{m.campaign_status_open()}</Badge>
  {:else if campaign.outcome === 'PASSED'}
    <Badge variant="passed">{m.campaign_outcome_passed()}</Badge>
  {:else if campaign.outcome === 'INCONCLUSIVE'}
    <Badge variant="neutral" glyph={false}>{m.campaign_outcome_inconclusive()}</Badge>
  {:else}
    <Badge variant="failed">{m.campaign_outcome_failed()}</Badge>
  {/if}
</a>
