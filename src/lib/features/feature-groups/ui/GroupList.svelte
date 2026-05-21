<script lang="ts">
  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { persistedSet } from '$lib/shared/storage/persisted-set.svelte';
  import FeatureGroupRow from './FeatureGroupRow.svelte';
  import UngroupedSection from './UngroupedSection.svelte';
  import DeleteGroupModal, { type DeleteGroupTarget } from './DeleteGroupModal.svelte';
  import type { FeatureRowData } from '$lib/entities/feature/ui/FeatureRow.svelte';

  type GroupNode = {
    group:    { id: string; name: string };
    features: FeatureRowData[];
  };

  type Props = {
    projectId:       string;
    groups:          GroupNode[];
    ungrouped:       FeatureRowData[];
    flakeFeatureIds: Set<string>;
  };

  let { projectId, groups, ungrouped, flakeFeatureIds }: Props = $props();

  let deleting = $state<DeleteGroupTarget | null>(null);

  const collapsed = untrack(() => persistedSet(`trace.groupCollapse.${projectId}`));

  function toggle(id: string): void {
    if (collapsed.has(id)) collapsed.delete(id);
    else                   collapsed.add(id);
  }

  function onFeatureDragStart(e: DragEvent, featureId: string): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('application/x-trace-feature', featureId);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function dropOnGroup(e: DragEvent, targetGroupId: string | null): Promise<void> {
    const featureId = e.dataTransfer?.getData('application/x-trace-feature');
    if (!featureId) return;
    const fd = new FormData();
    fd.set('featureId', featureId);
    fd.set('groupId',   targetGroupId ?? '');
    await fetch('?/moveFeature', { method: 'POST', body: fd });
    await invalidateAll();
  }
</script>

{#each groups as g (g.group.id)}
  <FeatureGroupRow
    groupNode={g}
    isCollapsed={collapsed.has(g.group.id)}
    {flakeFeatureIds}
    onToggle={() => toggle(g.group.id)}
    onFeatureDrop={(e) => dropOnGroup(e, g.group.id)}
    {onFeatureDragStart}
    onDeleteRequest={(target) => (deleting = target)}
  />
{/each}

{#if groups.length > 0 || ungrouped.length > 0}
  <UngroupedSection
    {ungrouped}
    isCollapsed={collapsed.has('__ungrouped__')}
    {flakeFeatureIds}
    onToggle={() => toggle('__ungrouped__')}
    onFeatureDrop={(e) => dropOnGroup(e, null)}
    {onFeatureDragStart}
  />
{/if}

<DeleteGroupModal target={deleting} onClose={() => (deleting = null)} />
