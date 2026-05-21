<script lang="ts">
  import GroupSection from '$lib/features/feature-groups/ui/GroupSection.svelte';
  import FeatureRow, { type FeatureRowData } from '$lib/entities/feature/ui/FeatureRow.svelte';

  type Props = {
    ungrouped:          FeatureRowData[];
    isCollapsed:        boolean;
    flakeFeatureIds:    Set<string>;
    onToggle:           () => void;
    onFeatureDrop:      (e: DragEvent) => void;
    onFeatureDragStart: (e: DragEvent, id: string) => void;
  };

  let { ungrouped, isCollapsed, flakeFeatureIds, onToggle, onFeatureDrop, onFeatureDragStart }: Props = $props();
</script>

<GroupSection
  title="Ungrouped"
  count={ungrouped.length}
  collapsed={isCollapsed}
  {onToggle}
  {onFeatureDrop}
>
  {#if ungrouped.length === 0}
    <div class="px-3.5 py-2.5 text-[12.5px] text-ink-3">Drop here to ungroup</div>
  {:else}
    {#each ungrouped as f (f.id)}
      <FeatureRow
        feature={f}
        isFlaky={flakeFeatureIds.has(f.id)}
        onDragStart={(e) => onFeatureDragStart(e, f.id)}
      />
    {/each}
  {/if}
</GroupSection>
