<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import * as m from '$lib/paraglide/messages';
  import type { ManualScenarioRow } from '$lib/server/features/manual-scenarios';

  type Props = {
    row:                 ManualScenarioRow;
    onOptimisticArchive: () => void;
    onArchiveRestore:    () => void;
    onError:             (msg: string | null) => void;
  };

  let { row, onOptimisticArchive, onArchiveRestore, onError }: Props = $props();

  let editing                          = $state(false);
  let draft                            = $state(untrack(() => row.name));
  let inputEl: HTMLInputElement | null = $state(null);
  let renameForm:  HTMLFormElement;

  function startEdit(): void {
    draft   = row.name;
    editing = true;
  }

  function commit(): void {
    editing = false;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== row.name) renameForm.requestSubmit();
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

  <form
    bind:this={renameForm}
    action="?/renameManualScenario"
    method="POST"
    use:enhance={({ formData }) => {
      formData.set('scenarioId', row.id);
      formData.set('name',       draft.trim());
      onError(null);
      return async ({ result, update }) => {
        if (result.type === 'failure') {
          const reason = (result.data as { reason?: string } | undefined)?.reason;
          if (reason === 'name-taken-gherkin')      onError(m.manual_scenario_name_taken_gherkin());
          else if (reason === 'name-taken-manual')  onError(m.manual_scenario_name_taken_manual());
          else                                      onError('rename failed');
          draft = row.name;
          return;
        }
        await update();
      };
    }}
    hidden
  ></form>

  <form
    action="?/archiveManualScenario"
    method="POST"
    use:enhance={({ formData }) => {
      formData.set('scenarioId', row.id);
      onError(null);
      onOptimisticArchive();
      return async ({ result, update }) => {
        if (result.type === 'failure') {
          onArchiveRestore();
          onError('archive failed');
        }
        await update();
      };
    }}
  >
    <button
      type="submit"
      class="text-ink-3 hover:text-fail-ink text-lg leading-none"
      aria-label={m.manual_scenarios_archive()}
    >×</button>
  </form>
</li>
