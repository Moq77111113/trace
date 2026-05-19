<script lang="ts">
  import Pill        from '$lib/shared/ui/Pill.svelte';
  import Icon        from '$lib/shared/ui/Icon.svelte';
  import Input       from '$lib/shared/ui/Input.svelte';
  import GroupSection from '$lib/features/feature-groups/ui/GroupSection.svelte';
  import FeatureRow,  { type FeatureRowData } from '$lib/entities/feature/ui/FeatureRow.svelte';
  import DeleteGroupModal, { type DeleteGroupTarget } from './DeleteGroupModal.svelte';
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';

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

  let renamingId  = $state<string | null>(null);
  let renameValue = $state('');
  let renameError = $state<string | null>(null);

  let deleting = $state<DeleteGroupTarget | null>(null);

  const storageKey = $derived(`trace.groupCollapse.${projectId}`);

  function loadCollapsed(): Set<string> {
    if (!browser) return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  }

  let collapsed = $state<Set<string>>(loadCollapsed());

  $effect(() => {
    collapsed = loadCollapsed();
  });

  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id); else next.add(id);
    collapsed = next;
    if (browser) localStorage.setItem(storageKey, JSON.stringify([...next]));
  }

  function startRename(g: GroupNode) {
    renamingId  = g.group.id;
    renameValue = g.group.name;
    renameError = null;
  }

  function cancelRename() {
    renamingId  = null;
    renameError = null;
  }

  function onFeatureDragStart(e: DragEvent, featureId: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('application/x-trace-feature', featureId);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function dropOnGroup(e: DragEvent, targetGroupId: string | null) {
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
    <GroupSection
      title={renamingId === g.group.id ? '' : g.group.name}
      count={g.features.length}
      collapsed={collapsed.has(g.group.id)}
      onToggle={() => toggle(g.group.id)}
      onFeatureDrop={(e) => dropOnGroup(e, g.group.id)}
    >
      {#snippet header()}
        {#if renamingId === g.group.id}
          <form
            method="POST"
            action="?/renameGroup"
            use:enhance={() =>
              ({ result, update }) => {
                if (result.type === 'failure') {
                  renameError = String(result.data?.error ?? 'unknown');
                  return update({ reset: false });
                }
                cancelRename();
                return update();
              }}
            class="flex items-center gap-2"
          >
            <input type="hidden" name="groupId" value={g.group.id} />
            <Input
              name="name"
              bind:value={renameValue}
              autofocus
              onkeydown={(e) => { if (e.key === 'Escape') cancelRename(); }}
              onblur={(e) => e.currentTarget.form?.requestSubmit()}
            />
            {#if renameError}
              <Pill kind="fail" glyph={false}>
                {renameError === 'duplicate-name' ? 'name taken' : renameError}
              </Pill>
            {/if}
          </form>
        {:else}
          <button
            type="button"
            aria-label="Rename group"
            class="w-[26px] h-[26px] grid place-items-center bg-transparent border-0 rounded-md text-ink-3 cursor-pointer hover:bg-surface-2 hover:text-ink"
            onclick={() => startRename(g)}
          >
            <Icon name="Settings" size={12} />
          </button>
          <button
            type="button"
            aria-label="Delete group"
            class="w-[26px] h-[26px] grid place-items-center bg-transparent border-0 rounded-md text-ink-3 cursor-pointer hover:bg-fail-soft hover:text-fail-ink"
            onclick={() => (deleting = { id: g.group.id, name: g.group.name, count: g.features.length })}
          >
            <Icon name="Trash" size={12} />
          </button>
        {/if}
      {/snippet}

      {#if g.features.length === 0}
        <div class="px-3.5 py-2.5 text-[12.5px] text-ink-3">No features yet</div>
      {:else}
        {#each g.features as f (f.id)}
          <FeatureRow
            feature={f}
            isFlaky={flakeFeatureIds.has(f.id)}
            onDragStart={(e) => onFeatureDragStart(e, f.id)}
          />
        {/each}
      {/if}
    </GroupSection>
{/each}

{#if groups.length > 0 || ungrouped.length > 0}
  <GroupSection
    title="Ungrouped"
    count={ungrouped.length}
    collapsed={collapsed.has('__ungrouped__')}
    onToggle={() => toggle('__ungrouped__')}
    onFeatureDrop={(e) => dropOnGroup(e, null)}
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
{/if}

<DeleteGroupModal target={deleting} onClose={() => (deleting = null)} />
