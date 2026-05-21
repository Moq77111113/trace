<script lang="ts">
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';
  import { SvelteSet } from 'svelte/reactivity';
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

  const storageKey = $derived(`trace.groupCollapse.${projectId}`);
  const collapsed  = new SvelteSet<string>();

  $effect(() => {
    if (!browser) return;
    collapsed.clear();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) for (const id of JSON.parse(raw) as string[]) collapsed.add(id);
    } catch {
      /* empty / corrupted entry, ignore */
    }
  });

  function toggle(id: string): void {
    if (collapsed.has(id)) collapsed.delete(id);
    else                   collapsed.add(id);
    if (browser) localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
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
