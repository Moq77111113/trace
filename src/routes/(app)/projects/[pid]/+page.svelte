<script lang="ts">
  import Pill         from '$lib/components/ui/Pill.svelte';
  import Button       from '$lib/components/ui/Button.svelte';
  import Icon         from '$lib/components/ui/Icon.svelte';
  import EmptyState   from '$lib/components/ui/EmptyState.svelte';
  import GroupSection from '$lib/components/groups/GroupSection.svelte';
  import Modal        from '$lib/components/ui/Modal.svelte';
  import Input        from '$lib/components/ui/Input.svelte';
  import { enhance }  from '$app/forms';
  import { browser }  from '$app/environment';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { invalidateAll } from '$app/navigation';
  import type { PillKind } from '$lib/components/ui/Pill.svelte';

  let createOpen  = $state(false);
  let createName  = $state('');
  let createError = $state<string | null>(null);

  let renamingId  = $state<string | null>(null);
  let renameValue = $state('');
  let renameError = $state<string | null>(null);

  let deleting = $state<{ id: string; name: string; count: number } | null>(null);

  let { data } = $props();

  type Feature = (typeof data)['byGroup']['ungrouped'][number];

  type FeatureStatus = { kind: PillKind; label: string };

  function statusFor(f: Feature): FeatureStatus {
    if ((f.parseErrors?.length ?? 0) > 0) {
      const n = f.parseErrors?.length ?? 0;
      return { kind: 'fail', label: `${n} parse error${n === 1 ? '' : 's'}` };
    }
    if (f.latestFinishedStatus === 'PASSED')  return { kind: 'pass',    label: 'pass'   };
    if (f.latestFinishedStatus === 'FAILED')  return { kind: 'fail',    label: 'fail'   };
    if (f.latestFinishedStatus === 'SKIPPED') return { kind: 'skip',    label: 'skip'   };
    return { kind: 'pending', label: 'no run' };
  }

  function relative(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days  = Math.floor(hours / 24);
    if (days < 30)  return `${days}d`;
    return date.toLocaleDateString();
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

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <header class="flex items-end justify-between gap-4 mb-4 max-md:flex-col max-md:items-stretch">
    <div>
      <h1 class="text-[20px] font-semibold tracking-tight">{data.project.name}</h1>
      {#if data.project.description}
        <p class="text-[13px] text-ink-3 mt-1">{data.project.description}</p>
      {/if}
    </div>
    <div class="flex items-center gap-2 max-md:flex-wrap">
      <Button
        variant="secondary"
        onclick={() => { createOpen = true; createName = ''; createError = null; }}
      >
        <Icon name="Plus" size={13} /> New group
      </Button>
      <Button variant="primary" href="/projects/{data.project.id}/features/new">
        <Icon name="Plus" size={13} /> New feature
      </Button>
    </div>
  </header>

  {#if data.byGroup.groups.length === 0 && data.byGroup.ungrouped.length === 0}
    <EmptyState title="No features yet" />
  {:else}
    <div
      use:dndzone={{ items: dragItems, flipDurationMs: 150 }}
      onconsider={onDndConsider}
      onfinalize={onDndFinalize}
    >
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
                onclick={() => { renamingId = g.group.id; renameValue = g.group.name; renameError = null; }}
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
              {@const status = statusFor(f)}
              <a
                href="/projects/{f.projectId}/features/{f.id}"
                class="grid grid-cols-[minmax(0,1.6fr)_0.6fr_0.6fr_0.5fr] max-lg:grid-cols-[minmax(0,1.4fr)_0.8fr_0.5fr] max-md:grid-cols-[minmax(0,1.2fr)_0.7fr] gap-3.5 items-center px-3.5 py-2 border-t border-border first:border-t-0 hover:bg-surface-2 transition-colors"
              >
                <span class="flex items-center gap-2.5 min-w-0">
                  <Icon name="File" size={14} class="text-ink-3 shrink-0" />
                  <span class="font-medium text-[13px] truncate">{f.name}</span>
                </span>
                <span class="text-[12.5px] text-ink-2 tabular-nums max-lg:[grid-column:auto]">
                  <Pill kind={status.kind}>{status.label}</Pill>
                </span>
                <span class="text-[12.5px] text-ink-3 tabular-nums max-md:hidden">v{f.version}</span>
                <span class="text-[12.5px] text-ink-3 tabular-nums max-md:hidden">{relative(f.updatedAt)}</span>
              </a>
            {/each}
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
        {#each data.byGroup.ungrouped as f (f.id)}
          {@const status = statusFor(f)}
          <a
            href="/projects/{f.projectId}/features/{f.id}"
            class="grid grid-cols-[minmax(0,1.6fr)_0.6fr_0.6fr_0.5fr] max-lg:grid-cols-[minmax(0,1.4fr)_0.8fr_0.5fr] max-md:grid-cols-[minmax(0,1.2fr)_0.7fr] gap-3.5 items-center px-3.5 py-2 border-t border-border first:border-t-0 hover:bg-surface-2 transition-colors"
          >
            <span class="flex items-center gap-2.5 min-w-0">
              <Icon name="File" size={14} class="text-ink-3 shrink-0" />
              <span class="font-medium text-[13px] truncate">{f.name}</span>
            </span>
            <span class="text-[12.5px] text-ink-2 tabular-nums max-lg:[grid-column:auto]">
              <Pill kind={status.kind}>{status.label}</Pill>
            </span>
            <span class="text-[12.5px] text-ink-3 tabular-nums max-md:hidden">v{f.version}</span>
            <span class="text-[12.5px] text-ink-3 tabular-nums max-md:hidden">{relative(f.updatedAt)}</span>
          </a>
        {/each}
      </GroupSection>
    {/if}
  {/if}
</div>

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
      class="flex items-center justify-end gap-2 mt-4"
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
      <p class="mt-2 text-[12px] text-fail-ink">
        {createError === 'duplicate-name' ? 'A group with this name already exists.' : createError}
      </p>
    {/if}
    <div class="flex items-center justify-end gap-2 mt-4">
      <Button variant="ghost" onclick={() => (createOpen = false)} type="button">Cancel</Button>
      <Button type="submit" variant="primary">Create</Button>
    </div>
  </form>
</Modal>
