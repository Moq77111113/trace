<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { failureReason } from '$lib/shared/forms/action-result';
  import * as m from '$lib/paraglide/messages';
  import type { ManualScenarioRow } from '$lib/server/features/manual-scenarios';
  import type { ManualScenarioStepRow } from '$lib/server/features/manual-scenario-steps';
  import StepList from './steps/StepList.svelte';

  type Props = {
    row:                 ManualScenarioRow;
    steps:               ManualScenarioStepRow[];
    expanded:            boolean;
    onToggle:            () => void;
    onOptimisticArchive: () => void;
    onArchiveRestore:    () => void;
    onError:             (msg: string | null) => void;
    readonly?:           boolean;
  };

  let { row, steps, expanded, onToggle, onOptimisticArchive, onArchiveRestore, onError, readonly = false }: Props = $props();

  let editing                          = $state(false);
  let draft                            = $state(untrack(() => row.name));
  let inputEl: HTMLInputElement | null = $state(null);
  let renameForm:  HTMLFormElement;

  function startEdit(): void {
    if (readonly) return;
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

<li class="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2">
  <div class="flex items-center gap-3">
  <button
    type="button"
    onclick={onToggle}
    class="text-ink-mute hover:text-ink-2 px-1 transition-transform"
    class:rotate-90={expanded}
    aria-expanded={expanded}
    aria-label={m.manual_scenario_steps_toggle()}
  >▸</button>

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
  {:else if readonly}
    <span class="flex-1 text-left text-sm text-ink">{row.name}</span>
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
          const reason = failureReason(result);
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

  {#if !readonly}
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
  {/if}
  </div>

  {#if expanded}
    <div class="mt-2 mb-1">
      <StepList scenarioId={row.id} {steps} {readonly} />
    </div>
  {/if}
</li>
