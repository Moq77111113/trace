<script lang="ts">
  import DistBar from '$lib/entities/execution/ui/DistBar.svelte';

  type Props = {
    label:   string;
    total:   number;
    passed:  number;
    failed:  number;
    skipped: number;
  };

  let { label, total, passed, failed, skipped }: Props = $props();

  const counts = $derived({ passed, failed, skipped, pending: 0 });
</script>

<section class="border border-border rounded-md p-4 flex flex-col gap-3 mb-6">
  <div class="flex items-baseline justify-between">
    <span class="text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">{label}</span>
    <span data-testid="summary-total" class="text-[18px] font-semibold tabular-nums">{total}</span>
  </div>
  <DistBar {counts} />
  <div class="flex items-center gap-4 text-[12px] tabular-nums">
    <span><span class="text-ink-mute mr-1">passed</span><span data-testid="summary-passed">{passed}</span></span>
    <span><span class="text-ink-mute mr-1">failed</span><span data-testid="summary-failed">{failed}</span></span>
    <span><span class="text-ink-mute mr-1">skipped</span><span data-testid="summary-skipped">{skipped}</span></span>
  </div>
</section>
