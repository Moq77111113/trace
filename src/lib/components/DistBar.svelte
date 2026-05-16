<script lang="ts">
  import { distBarSegments, type ScenarioCounts } from '$lib/executions/format';

  type Props = {
    counts: ScenarioCounts;
    width?: number;
    class?: string;
  };

  let { counts, width = 96, class: cls = '' }: Props = $props();

  const segments = $derived(distBarSegments(counts));

  const SEG_BG: Record<'pass' | 'fail' | 'skip' | 'neutral', string> = {
    pass:    'bg-pass',
    fail:    'bg-fail',
    skip:    'bg-skip',
    neutral: 'bg-ink-3',
  };
</script>

<span
  class="inline-flex h-1.5 overflow-hidden rounded-full bg-surface-2 border border-border {cls}"
  style:width="{width}px"
  aria-hidden="true"
>
  {#each segments as seg, i (i)}
    <span class="block h-full {SEG_BG[seg.kind]}" style:width="{seg.width}%"></span>
  {/each}
</span>
