<script lang="ts">
  import type { ScenarioSelection, ScenarioFilter } from '../model/selection.svelte';

  type Props = { selection: ScenarioSelection };
  let { selection }: Props = $props();

  const tabs: { value: ScenarioFilter; label: string }[] = [
    { value: 'all',     label: 'All'     },
    { value: 'failed',  label: 'Failed'  },
    { value: 'pending', label: 'Pending' },
  ];

  function countOf(value: ScenarioFilter): number {
    if (value === 'failed')  return selection.failedCount;
    if (value === 'pending') return selection.pendingCount;
    return selection.counts.total;
  }
</script>

<div class="px-3.5 py-2 border-b border-border flex items-center gap-1 text-[11.5px]">
  {#each tabs as tab (tab.value)}
    {@const active = selection.filter === tab.value}
    <button
      type="button"
      class="px-2 py-1 rounded-md bg-transparent border-0 cursor-pointer text-ink-3 hover:text-ink-2 hover:bg-surface-2 {active ? 'bg-surface text-ink font-medium' : ''}"
      onclick={() => selection.setFilter(tab.value)}
    >
      {tab.label}
      <span class="ml-1 text-ink-3 tabular-nums">{countOf(tab.value)}</span>
    </button>
  {/each}
</div>
