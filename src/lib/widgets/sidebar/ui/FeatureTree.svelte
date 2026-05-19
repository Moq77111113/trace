<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import Icon   from '$lib/shared/ui/Icon.svelte';
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import Status from '$lib/shared/ui/Status.svelte';
  import { toStatusKind, type StatusKind } from '$lib/shared/ui/Status.svelte';
  import * as m from '$lib/paraglide/messages';

  type FeatureRow = {
    id:                    string;
    name:                  string;
    code:                  string;
    latestFinishedStatus?: string | null;
  };
  type GroupRow = { id: string; name: string };
  type Tree = {
    groups:    { group: GroupRow; features: FeatureRow[] }[];
    ungrouped: FeatureRow[];
  };

  type Props = {
    projectSlug:       string;
    tree:              Tree;
    activeFeatureCode: string | null;
    flakeFeatureIds:   Set<string> | undefined;
  };

  let { projectSlug, tree, activeFeatureCode, flakeFeatureIds }: Props = $props();

  const expanded = new SvelteMap<string, boolean>();
  const isExpanded = (id: string): boolean => expanded.get(id) ?? true;
  const toggle     = (id: string): void    => { expanded.set(id, !isExpanded(id)); };

  const status = (f: FeatureRow): StatusKind =>
    f.latestFinishedStatus ? toStatusKind(f.latestFinishedStatus) : 'pending';
</script>

<div class="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-ink-3 flex items-center justify-between">
  <span>{m.nav_features()}</span>
  <a
    href="/p/{projectSlug}/new"
    aria-label={m.nav_new_feature()}
    class="w-4 h-4 grid place-items-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
  >
    <Icon name="Plus" size={12} />
  </a>
</div>

<div class="px-2 flex flex-col gap-px overflow-y-auto">
  {#each tree.groups as g (g.group.id)}
    {@const open = isExpanded(g.group.id)}
    <button
      type="button"
      class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-ink-2 text-[12.5px] hover:bg-surface-2 hover:text-ink w-full text-left bg-transparent border-0 cursor-pointer"
      onclick={() => toggle(g.group.id)}
    >
      <Icon
        name="ChevronRight"
        size={12}
        class="text-ink-3 transition-transform {open ? 'rotate-90' : ''}"
      />
      <span class="flex-1 font-medium">{g.group.name}</span>
      <span class="text-[10.5px] text-ink-3 tabular-nums">{g.features.length}</span>
    </button>

    {#if open}
      {#each g.features as f (f.id)}
        {@const active = activeFeatureCode === f.code}
        <a
          href="/p/{projectSlug}/{f.code}"
          class="flex items-center gap-2 pl-6 pr-2 py-1 rounded-md text-[12.5px] text-ink-2 leading-snug hover:bg-surface-2 hover:text-ink
                 aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[var(--shadow-1)]"
          aria-current={active ? 'page' : undefined}
        >
          <Status kind={status(f)} size={10} />
          <span class="font-mono text-[10.5px] text-ink-3 shrink-0 tabular-nums">{f.code}</span>
          <span class="flex-1 min-w-0 truncate">{f.name}</span>
          {#if flakeFeatureIds?.has(f.id)}
            <Pill kind="flake" glyph={false}>flake</Pill>
          {/if}
        </a>
      {/each}
    {/if}
  {/each}

  {#each tree.ungrouped as f (f.id)}
    {@const active = activeFeatureCode === f.code}
    <a
      href="/p/{projectSlug}/{f.code}"
      class="flex items-center gap-2 pl-3.5 pr-2 py-1 rounded-md text-[12.5px] text-ink-2 leading-snug hover:bg-surface-2 hover:text-ink
             aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[var(--shadow-1)]"
      aria-current={active ? 'page' : undefined}
    >
      <Status kind={status(f)} size={10} />
      <span class="flex-1 min-w-0 truncate">{f.name}</span>
      {#if flakeFeatureIds?.has(f.id)}
        <Pill kind="flake" glyph={false}>flake</Pill>
      {/if}
    </a>
  {/each}
</div>
