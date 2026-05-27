<script lang="ts">
  import CampaignRow, { type CampaignRowData } from './CampaignRow.svelte';

  type Props = { slug: string; campaigns: CampaignRowData[] };
  let { slug, campaigns }: Props = $props();
</script>

<div class="flex flex-col gap-2">
  {#each campaigns as campaign (campaign.id)}
    <CampaignRow {slug} {campaign} />
  {/each}
</div>
