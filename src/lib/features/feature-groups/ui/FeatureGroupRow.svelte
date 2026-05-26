<script lang="ts">
  import Gate from '$lib/shared/authz/Gate.svelte';
  import Icon from '$lib/shared/ui/Icon.svelte';
  import GroupSection from '$lib/features/feature-groups/ui/GroupSection.svelte';
  import FeatureRow, { type FeatureRowData } from '$lib/entities/feature/ui/FeatureRow.svelte';
  import GroupRename from './GroupRename.svelte';
  import type { DeleteGroupTarget } from './DeleteGroupModal.svelte';

  type GroupNode = {
    group: { id: string; name: string };
    features: FeatureRowData[];
  };

  type Props = {
    groupNode: GroupNode;
    isCollapsed: boolean;
    flakeFeatureIds: Set<string>;
    onToggle: () => void;
    onFeatureDrop: (e: DragEvent) => void;
    onFeatureDragStart: (e: DragEvent, id: string) => void;
    onDeleteRequest: (target: DeleteGroupTarget) => void;
  };

  let { 
    groupNode, isCollapsed, flakeFeatureIds, 
    onToggle, onFeatureDrop, onFeatureDragStart, onDeleteRequest 
  }: Props = $props();

  let isEditing = $state(false);
</script>

<GroupSection
  title={isEditing ? '' : groupNode.group.name}
  count={groupNode.features.length}
  collapsed={isCollapsed}
  {onToggle}
  {onFeatureDrop}
>
  {#snippet header()}
    {#if isEditing}
      <GroupRename 
        groupId={groupNode.group.id} 
        initialName={groupNode.group.name} 
        onCancel={() => (isEditing = false)} 
      />
    {:else}
      <Gate can="feature.author">
        <button
          type="button"
          aria-label="Rename group"
          class="size-6.5 grid place-items-center bg-transparent border-0 rounded-md text-ink-3 cursor-pointer hover:bg-surface-2 hover:text-ink"
          onclick={() => (isEditing = true)}
        >
          <Icon name="Settings" size={12} />
        </button>

        <button
          type="button"
          aria-label="Delete group"
          class="size-6.5 grid place-items-center bg-transparent border-0 rounded-md text-ink-3 cursor-pointer hover:bg-fail-soft hover:text-fail-ink"
          onclick={() => onDeleteRequest({ id: groupNode.group.id, name: groupNode.group.name, count: groupNode.features.length })}
        >
          <Icon name="Trash" size={12} />
        </button>
      </Gate>
    {/if}
  {/snippet}

  {#if groupNode.features.length === 0}
    <div class="px-3.5 py-2.5 text-[12.5px] text-ink-3">No features yet</div>
  {:else}
    {#each groupNode.features as f (f.id)}
      <FeatureRow
        feature={f}
        isFlaky={flakeFeatureIds.has(f.id)}
        onDragStart={(e) => onFeatureDragStart(e, f.id)}
      />
    {/each}
  {/if}
</GroupSection>