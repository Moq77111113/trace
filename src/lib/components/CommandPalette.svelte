<script lang="ts" module>
  import type { runs } from '$lib/server/db/schema';

  export type SearchResult = {
    featureId:   string;
    featureName: string;
    projectId:   string;
    projectName: string;
    groupName:   string | null;
    status:      typeof runs.status.enumValues[number] | null;
  };
</script>

<script lang="ts">
  import { Dialog as Bits } from 'bits-ui';
  import { goto } from '$app/navigation';
  import Icon   from './ui/Icon.svelte';
  import Status from './ui/Status.svelte';
  import Kbd    from './ui/Kbd.svelte';
  import { toStatusKind } from './ui/Status.svelte';

  type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  };

  let { open, onOpenChange }: Props = $props();

  let query    = $state('');
  let results  = $state<SearchResult[]>([]);
  let selected = $state(0);
  let loading  = $state(false);
  let inputEl  = $state<HTMLInputElement | undefined>();

  let pending: ReturnType<typeof setTimeout> | undefined;
  let inflight: AbortController | undefined;

  $effect(() => {
    if (!open) {
      query   = '';
      results = [];
      selected = 0;
      return;
    }
    queueMicrotask(() => inputEl?.focus());
  });

  $effect(() => {
    const q = query.trim();
    selected = 0;

    if (pending)  clearTimeout(pending);
    if (inflight) inflight.abort();

    if (!q) {
      results = [];
      loading = false;
      return;
    }

    loading = true;
    pending = setTimeout(async () => {
      const ctrl = new AbortController();
      inflight = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const body = (await res.json()) as { results: SearchResult[] };
        if (!ctrl.signal.aborted) results = body.results;
      } catch (err) {
        if (!(err instanceof Error) || err.name !== 'AbortError') results = [];
      } finally {
        if (!ctrl.signal.aborted) loading = false;
      }
    }, 150);
  });

  function pick(r: SearchResult) {
    onOpenChange(false);
    void goto(`/projects/${r.projectId}/features/${r.featureId}`);
  }

  function onKey(e: KeyboardEvent) {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = (selected + 1) % results.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = (selected - 1 + results.length) % results.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[selected];
      if (hit) pick(hit);
    }
  }
</script>

<Bits.Root bind:open={() => open, onOpenChange}>
  <Bits.Portal>
    <Bits.Overlay class="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

    <Bits.Content
      class="fixed left-1/2 top-[15vh] -translate-x-1/2 z-50 w-[640px] max-w-[92vw] bg-surface border border-border rounded-xl shadow-[var(--shadow-pop)] overflow-hidden"
    >
      <Bits.Title class="sr-only">Search</Bits.Title>

      <div class="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <Icon name="Search" size={14} class="text-ink-3" />
        <input
          bind:this={inputEl}
          bind:value={query}
          onkeydown={onKey}
          type="text"
          placeholder="Search features…"
          class="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-3 outline-none border-0"
          autocomplete="off"
          spellcheck="false"
        />
        <Kbd>ESC</Kbd>
      </div>

      <div class="max-h-[420px] overflow-y-auto">
        {#if query.trim() === ''}
          <div class="px-4 py-8 text-center text-[12.5px] text-ink-3">
            Start typing to find a feature across all projects.
          </div>
        {:else if loading && results.length === 0}
          <div class="flex flex-col gap-px py-1">
            {#each [0, 1, 2, 3, 4] as i (i)}
              <div class="flex items-center gap-2.5 px-4 py-2.5">
                <span class="w-3 h-3 rounded-full bg-surface-2 inline-block"></span>
                <span class="h-[13px] rounded bg-surface-2 inline-block" style:width="{60 - i * 5}%"></span>
              </div>
            {/each}
          </div>
        {:else if results.length === 0}
          <div class="px-4 py-8 text-center text-[12.5px] text-ink-3">
            No matches for <span class="text-ink-2 font-mono">{query}</span>
          </div>
        {:else}
          <ul class="flex flex-col py-1 m-0 p-0 list-none">
            {#each results as r, i (r.featureId)}
              {@const kind = r.status ? toStatusKind(r.status) : 'pending'}
              {@const active = i === selected}
              <li>
                <button
                  type="button"
                  onclick={() => pick(r)}
                  onmouseenter={() => (selected = i)}
                  class="grid grid-cols-[18px_1fr_auto] gap-3 items-center w-full px-4 py-2 text-left bg-transparent border-0 cursor-pointer {active ? 'bg-surface-2' : 'hover:bg-surface-2/60'}"
                >
                  <Status kind={kind} size={14} />
                  <div class="min-w-0">
                    <div class="text-[13px] font-medium text-ink truncate">{r.featureName}</div>
                    <div class="text-[11.5px] text-ink-3 font-mono mt-0.5 truncate">
                      {r.projectName}{r.groupName ? ` / ${r.groupName}` : ''}
                    </div>
                  </div>
                  {#if active}
                    <Kbd>↵</Kbd>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <footer class="flex items-center gap-3 px-4 py-2 border-t border-border bg-canvas text-[11px] text-ink-3">
        <span class="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
        <span class="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
        <span class="ml-auto flex items-center gap-1"><Kbd>ESC</Kbd> close</span>
      </footer>
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
