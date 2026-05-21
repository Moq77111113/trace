<script lang="ts">
  import { untrack } from 'svelte';
  import type { ManualScenarioRow } from '../api/client';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    row:       ManualScenarioRow;
    onRename:  (name: string) => void;
    onArchive: () => void;
  };

  let { row, onRename, onArchive }: Props = $props();

  let editing                          = $state(false);
  let draft                            = $state(untrack(() => row.name));
  let inputEl: HTMLInputElement | null = $state(null);

  function startEdit(): void {
    draft   = row.name;
    editing = true;
  }

  function commit(): void {
    editing = false;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== row.name) onRename(trimmed);
    else draft = row.name;
  }

  function cancel(): void {
    editing = false;
    draft   = row.name;
  }

  $effect(() => {
    if (editing && inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  });
</script>

<li class="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
  {#if editing}
    <input
      bind:this={inputEl}
      class="flex-1 rounded border border-border bg-bg px-2 py-1 text-sm text-ink"
      bind:value={draft}
      onblur={commit}
      onkeydown={(e) => {
        if (e.key === 'Enter')  commit();
        if (e.key === 'Escape') cancel();
      }}
    />
  {:else}
    <button
      type="button"
      class="flex-1 text-left text-sm text-ink hover:text-accent"
      onclick={startEdit}
    >{row.name}</button>
  {/if}
  <button
    type="button"
    class="text-ink-3 hover:text-fail-ink text-lg leading-none"
    aria-label={m.manual_scenarios_archive()}
    onclick={onArchive}
  >×</button>
</li>
