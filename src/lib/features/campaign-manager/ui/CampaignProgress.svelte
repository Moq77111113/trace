<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  type Props = { requiredPassed: number; requiredTotal: number };
  let { requiredPassed, requiredTotal }: Props = $props();

  const pct = $derived(
    requiredTotal === 0 ? 0 : Math.round((requiredPassed / requiredTotal) * 100)
  );
</script>

<div class="flex items-center gap-2 min-w-[160px]">
  <div class="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
    <div
      data-testid="campaign-progress-bar"
      class="h-full rounded-full bg-pass"
      style="width: {pct}%"
    ></div>
  </div>
  <span class="text-[12px] text-ink-3 tabular-nums whitespace-nowrap">
    {requiredPassed} / {requiredTotal}
  </span>
  <span class="text-[12px] text-ink-3 whitespace-nowrap">{m.campaign_progress_summary()}</span>
</div>
