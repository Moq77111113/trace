<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ManualScenarioStepRow } from '$lib/server/features/manual-scenario-steps';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    step:               ManualScenarioStepRow;
    onOptimisticRemove: () => void;
    onRemoveRestore:    () => void;
    onError:            (msg: string | null) => void;
    readonly:           boolean;
  };

  let { step, onOptimisticRemove, onRemoveRestore, onError, readonly }: Props = $props();

  let action   = $state(untrack(() => step.action));
  let expected = $state(untrack(() => step.expected ?? ''));
  let editForm = $state<HTMLFormElement>();

  function commit(): void {
    if (readonly) return;
    if (action.trim() === step.action && expected.trim() === (step.expected ?? '')) return;
    if (action.trim() === '') {
      action = step.action;
      return;
    }
    editForm?.requestSubmit();
  }
</script>

<div class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-start" draggable={!readonly} role="listitem">
  <span class="cursor-grab text-ink-mute select-none pt-1.5" aria-hidden="true">⠿</span>

  <textarea
    rows="1"
    bind:value={action}
    onblur={commit}
    onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } }}
    placeholder={m.manual_step_action_placeholder()}
    disabled={readonly}
    class="resize-none rounded-md border border-border bg-surface px-2 py-1.5 text-[12.5px]"
  ></textarea>

  <textarea
    rows="1"
    bind:value={expected}
    onblur={commit}
    onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } }}
    placeholder={m.manual_step_expected_placeholder()}
    disabled={readonly}
    class="resize-none rounded-md border border-border bg-surface px-2 py-1.5 text-[12.5px] text-ink-3"
  ></textarea>

  {#if !readonly}
    <form
      action="?/removeStep"
      method="POST"
      use:enhance={({ formData }) => {
        formData.set('stepId', step.id);
        onError(null);
        onOptimisticRemove();
        return async ({ result, update }) => {
          if (result.type === 'failure') {
            onRemoveRestore();
            onError(m.manual_step_error());
          }
          await update();
        };
      }}
    >
      <button type="submit" class="text-ink-mute hover:text-fail-ink px-1" aria-label={m.manual_step_remove()}>×</button>
    </form>
  {/if}
</div>

<form
  bind:this={editForm}
  action="?/editStep"
  method="POST"
  use:enhance={({ formData }) => {
    formData.set('stepId', step.id);
    formData.set('action', action.trim());
    formData.set('expected', expected.trim());
    onError(null);
    return async ({ result, update }) => {
      if (result.type === 'failure') {
        onError(m.manual_step_error());
        action   = step.action;
        expected = step.expected ?? '';
        return;
      }
      await update();
    };
  }}
  hidden
></form>
