<script lang="ts">
  import EmptyState   from '$lib/components/ui/EmptyState.svelte';
  import Badge        from '$lib/components/ui/Badge.svelte';
  import Button       from '$lib/components/ui/Button.svelte';
  import GroupSection from '$lib/components/groups/GroupSection.svelte';
  import Modal        from '$lib/components/ui/Modal.svelte';
  import Input        from '$lib/components/ui/Input.svelte';
  import { enhance }  from '$app/forms';
  import { browser }  from '$app/environment';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { invalidateAll } from '$app/navigation';

  let createOpen  = $state(false);
  let createName  = $state('');
  let createError = $state<string | null>(null);

  let renamingId  = $state<string | null>(null);
  let renameValue = $state('');
  let renameError = $state<string | null>(null);

  let deleting = $state<{ id: string; name: string; count: number } | null>(null);

  let { data } = $props();

  type Feature = (typeof data)['byGroup']['ungrouped'][number];

  type StatusBadge =
    | { label: string; variant: 'failed' | 'passed' | 'skipped' | 'neutral' }
    | null;

  function statusFor(f: Feature): StatusBadge {
    if ((f.parseErrors?.length ?? 0) > 0) return { label: `${f.parseErrors?.length} parse error(s)`, variant: 'failed' };
    if (f.latestFinishedStatus === 'PASSED')  return { label: 'PASSED',  variant: 'passed'  };
    if (f.latestFinishedStatus === 'FAILED')  return { label: 'FAILED',  variant: 'failed'  };
    if (f.latestFinishedStatus === 'SKIPPED') return { label: 'SKIPPED', variant: 'skipped' };
    return { label: 'no run', variant: 'neutral' };
  }

  const storageKey = $derived(`trace.groupCollapse.${data.project.id}`);

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

  type DragItem = { id: string; payload: (typeof data.byGroup.groups)[number] };
  let dragOverride = $state<DragItem[] | null>(null);
  const dragItems  = $derived<DragItem[]>(
    dragOverride ?? data.byGroup.groups.map((g) => ({ id: g.group.id, payload: g })),
  );

  function onDndConsider(e: CustomEvent<DndEvent<DragItem>>) {
    dragOverride = e.detail.items;
  }

  async function onDndFinalize(e: CustomEvent<DndEvent<DragItem>>) {
    const orderedIds = e.detail.items.map((i) => i.id);
    dragOverride = e.detail.items;
    const form = new FormData();
    form.set('orderedIds', JSON.stringify(orderedIds));
    await fetch('?/reorderGroups', { method: 'POST', body: form });
    await invalidateAll();
    dragOverride = null;
  }

  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id); else next.add(id);
    collapsed = next;
    if (browser) localStorage.setItem(storageKey, JSON.stringify([...next]));
  }
</script>

<div class="flex items-center justify-between mb-4">
  <h2 class="text-base font-semibold">Features</h2>
  <div class="flex gap-2">
    <Button variant="secondary" onclick={() => { createOpen = true; createName = ''; createError = null; }}>+ New group</Button>
    <Button href="/projects/{data.project.id}/features/new">+ New feature</Button>
  </div>
</div>

{#if data.byGroup.groups.length === 0 && data.byGroup.ungrouped.length === 0}
  <EmptyState title="No features yet" />
{:else}
  <div use:dndzone={{ items: dragItems, flipDurationMs: 150 }} onconsider={onDndConsider} onfinalize={onDndFinalize}>
    {#each dragItems as it (it.id)}
      {@const g = it.payload}
      <GroupSection
        title={renamingId === g.group.id ? '' : g.group.name}
        count={g.features.length}
        draggable={true}
        collapsed={collapsed.has(g.group.id)}
        onToggle={() => toggle(g.group.id)}
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
                  renamingId = null;
                  renameError = null;
                  return update();
                }}
              class="flex items-center gap-2"
            >
              <input type="hidden" name="groupId" value={g.group.id} />
              <Input
                name="name"
                bind:value={renameValue}
                autofocus
                onkeydown={(e) => { if (e.key === 'Escape') { renamingId = null; renameError = null; } }}
                onblur={(e) => e.currentTarget.form?.requestSubmit()}
              />
              {#if renameError}
                <span class="text-state-failed text-xs">
                  {renameError === 'duplicate-name' ? 'Name taken' : renameError}
                </span>
              {/if}
            </form>
          {:else}
            <button
              type="button"
              class="text-surface-400 hover:text-state-failed"
              aria-label="Delete group"
              onclick={() => (deleting = { id: g.group.id, name: g.group.name, count: g.features.length })}
            >🗑</button>
            <button
              type="button"
              class="text-surface-400 hover:text-surface-200"
              aria-label="Rename group"
              onclick={() => { renamingId = g.group.id; renameValue = g.group.name; renameError = null; }}
            >✎</button>
          {/if}
        {/snippet}

        {#if g.features.length === 0}
          <p class="px-3 py-2 text-xs text-surface-400">No features yet</p>
        {:else}
          <ul>
            {#each g.features as f (f.id)}
              {@const status = statusFor(f)}
              <li class="flex items-center px-3 py-1.5 hover:bg-surface-700 rounded">
                <a class="text-accent-400 hover:underline flex-1" href="/projects/{f.projectId}/features/{f.id}">{f.name}</a>
                {#if status}<Badge variant={status.variant}>{status.label}</Badge>{/if}
                <span class="ml-3 text-xs text-surface-400">{new Date(f.updatedAt).toLocaleString()}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </GroupSection>
    {/each}
  </div>

  {#if data.byGroup.ungrouped.length > 0}
    <GroupSection
      title="Ungrouped"
      count={data.byGroup.ungrouped.length}
      draggable={false}
      collapsed={collapsed.has('__ungrouped__')}
      onToggle={() => toggle('__ungrouped__')}
    >
      <ul>
        {#each data.byGroup.ungrouped as f (f.id)}
          {@const status = statusFor(f)}
          <li class="flex items-center px-3 py-1.5 hover:bg-surface-700 rounded">
            <a class="text-accent-400 hover:underline flex-1" href="/projects/{f.projectId}/features/{f.id}">{f.name}</a>
            {#if status}<Badge variant={status.variant}>{status.label}</Badge>{/if}
            <span class="ml-3 text-xs text-surface-400">{new Date(f.updatedAt).toLocaleString()}</span>
          </li>
        {/each}
      </ul>
    </GroupSection>
  {/if}
{/if}

<Modal open={deleting !== null} onOpenChange={(v) => { if (!v) deleting = null; }} title="Delete group?">
  {#if deleting}
    <p>
      Delete group <strong>{deleting.name}</strong>?
      {#if deleting.count === 0}
        It has no features.
      {:else}
        Its {deleting.count} feature{deleting.count === 1 ? '' : 's'} will be moved to <em>Ungrouped</em>.
      {/if}
    </p>
    <form
      method="POST"
      action="?/deleteGroup"
      use:enhance={() =>
        ({ result, update }) => {
          if (result.type === 'failure') return update({ reset: false });
          deleting = null;
          return update();
        }}
      class="mt-4 flex justify-end gap-2"
    >
      <input type="hidden" name="groupId" value={deleting.id} />
      <Button variant="ghost" onclick={() => (deleting = null)} type="button">Cancel</Button>
      <Button type="submit" variant="danger">Delete</Button>
    </form>
  {/if}
</Modal>

<Modal open={createOpen} onOpenChange={(v) => (createOpen = v)} title="New group">
  <form
    method="POST"
    action="?/createGroup"
    use:enhance={() =>
      ({ result, update }) => {
        if (result.type === 'failure') {
          createError = String(result.data?.error ?? 'unknown');
          return update({ reset: false });
        }
        createOpen = false;
        return update();
      }}
  >
    <Input name="name" bind:value={createName} placeholder="Authentication" autofocus />
    {#if createError}
      <p class="text-state-failed text-xs mt-2">
        {createError === 'duplicate-name' ? 'A group with this name already exists.' : createError}
      </p>
    {/if}
    <div class="mt-4 flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (createOpen = false)} type="button">Cancel</Button>
      <Button type="submit">Create</Button>
    </div>
  </form>
</Modal>
