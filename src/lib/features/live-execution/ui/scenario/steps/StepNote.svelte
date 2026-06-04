<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import * as m from '$lib/paraglide/messages';
  import Gate from '$lib/shared/authz/Gate.svelte';

  type Props = { step: { id: string; note: string | null } };
  let { step }: Props = $props();

  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

  let draft  = $state(untrack(() => step.note) ?? '');
  let status = $state<SaveStatus>('idle');
  let form: HTMLFormElement;
</script>

<form
  bind:this={form}
  action="?/saveStepNote"
  method="POST"
  use:enhance={({ formData }) => {
    formData.set('scenarioResultStepId', step.id);
    formData.set('note', draft);
    status = 'saving';
    return async ({ result }) => {
      status = result.type === 'success' ? 'saved' : 'error';
    };
  }}
  hidden
></form>

<Gate can="execution.run" disable>
  <textarea
    class="w-full min-h-[60px] px-3 py-2 text-[12.5px] leading-relaxed rounded-md bg-surface text-ink-2 placeholder:text-ink-3 border border-border focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent resize-y"
    maxlength={8000}
    value={draft}
    oninput={(e) => (draft = e.currentTarget.value)}
    onblur={() => form.requestSubmit()}
    placeholder={m.live_step_note_placeholder()}
  ></textarea>
</Gate>

<div class="min-h-[15px] text-[11px] tabular-nums">
  {#if status === 'saving'}
    <span class="text-ink-3">…</span>
  {:else if status === 'saved'}
    <span class="text-pass-ink">✓</span>
  {:else if status === 'error'}
    <span class="text-fail-ink" role="alert">⚠</span>
  {/if}
</div>
