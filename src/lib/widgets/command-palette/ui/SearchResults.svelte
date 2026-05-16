<script lang="ts">
  import Status from '$lib/shared/ui/Status.svelte';
  import Kbd    from '$lib/shared/ui/Kbd.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import type { SearchResult } from '../model/search-controller.svelte';

  type Props = {
    query:    string;
    loading:  boolean;
    results:  SearchResult[];
    selected: number;
    onPick:   (r: SearchResult) => void;
    onHover:  (i: number) => void;
  };

  let { query, loading, results, selected, onPick, onHover }: Props = $props();
</script>

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
        {@const kind   = r.status ? toStatusKind(r.status) : 'pending'}
        {@const active = i === selected}
        <li>
          <button
            type="button"
            onclick={() => onPick(r)}
            onmouseenter={() => onHover(i)}
            class="grid grid-cols-[18px_1fr_auto] gap-3 items-center w-full px-4 py-2 text-left bg-transparent border-0 cursor-pointer {active ? 'bg-surface-2' : 'hover:bg-surface-2/60'}"
          >
            <Status {kind} size={14} />
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
