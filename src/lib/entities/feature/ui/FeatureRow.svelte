<script lang="ts" module>
  export type FeatureRowData = {
    id:                   string;
    projectId:            string;
    name:                 string;
    parseErrors:          { line: number; column?: number; message: string }[] | null;
    latestFinishedStatus: string | null;
    lastRunAt:            Date | string | null;
    latestCounts: {
      passed:  number;
      failed:  number;
      skipped: number;
      pending: number;
    } | null;
  };
</script>

<script lang="ts">
  import Icon    from '$lib/components/ui/Icon.svelte';
  import Pill    from '$lib/components/ui/Pill.svelte';
  import DistBar from '$lib/components/DistBar.svelte';
  import { relativeTime }      from '$lib/i18n/relative-time';
  import { featureStatusPill } from '$lib/entities/feature/lib/format';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    feature: FeatureRowData;
    isFlaky: boolean;
  };

  let { feature, isFlaky }: Props = $props();

  const status = $derived(featureStatusPill(feature));
  const counts = $derived(feature.latestCounts ?? { passed: 0, failed: 0, skipped: 0, pending: 0 });
</script>

<a
  href="/projects/{feature.projectId}/features/{feature.id}"
  class="grid grid-cols-[minmax(0,1fr)_120px_120px_80px] max-lg:grid-cols-[minmax(0,1fr)_96px_120px] max-md:grid-cols-[minmax(0,1fr)_120px] gap-3.5 items-center px-3.5 py-2 border-t border-border first:border-t-0 hover:bg-surface-2 transition-colors"
>
  <span class="flex items-center gap-2.5 min-w-0">
    <Icon name="File" size={14} class="text-ink-3 shrink-0" />
    <span class="font-medium text-[13px] truncate">{feature.name}</span>
    {#if isFlaky}
      <Pill kind="flake" glyph={false}>{m.dash_feature_flake()}</Pill>
    {/if}
  </span>
  <span class="max-md:hidden">
    <DistBar {counts} width={96} />
  </span>
  <span class="text-[12.5px] text-ink-2 tabular-nums min-w-0">
    <Pill kind={status.kind} class="max-w-full truncate">{status.label}</Pill>
  </span>
  <span class="text-[12.5px] text-ink-3 tabular-nums text-right max-lg:hidden">
    {feature.lastRunAt ? relativeTime(feature.lastRunAt) : '—'}
  </span>
</a>
