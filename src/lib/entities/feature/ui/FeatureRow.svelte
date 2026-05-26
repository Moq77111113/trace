<script lang="ts" module>
  export type FeatureRowData = {
    id:                   string;
    projectId:            string;
    projectSlug:          string;
    name:                 string;
    code:                 string;
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
  import Icon    from '$lib/shared/ui/Icon.svelte';
  import Pill    from '$lib/shared/ui/Pill.svelte';
  import DistBar from '$lib/entities/execution/ui/DistBar.svelte';
  import { relativeTime }      from '$lib/shared/i18n/relative-time';
  import { featureStatusPill } from '$lib/entities/feature/lib/format';
  import { can } from '$lib/shared/authz/can';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    feature:      FeatureRowData;
    isFlaky:      boolean;
    onDragStart?: (e: DragEvent) => void;
  };

  let { feature, isFlaky, onDragStart }: Props = $props();

  const canMove = $derived(can('feature.author'));
  const status = $derived(featureStatusPill(feature));
  const counts = $derived(feature.latestCounts ?? { passed: 0, failed: 0, skipped: 0, pending: 0 });

  const handleDragStart = (e: DragEvent): void => {
    if (!canMove) return;
    onDragStart?.(e);
  };
</script>

<a
  href="/p/{feature.projectSlug}/{feature.code}"
  draggable={canMove && onDragStart !== undefined}
  ondragstart={handleDragStart}
  class="grid grid-cols-[minmax(0,1fr)_120px_120px_80px] max-lg:grid-cols-[minmax(0,1fr)_96px_120px] max-md:grid-cols-[minmax(0,1fr)_120px] gap-3.5 items-center px-3.5 py-2 border-t border-border first:border-t-0 hover:bg-surface-2 transition-colors"
>
  <span class="flex items-center gap-2.5 min-w-0">
    <Icon name="File" size={14} class="text-ink-3 shrink-0" />
    <span class="font-mono text-[11.5px] text-ink-3 shrink-0 tabular-nums">{feature.code}</span>
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
