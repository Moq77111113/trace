<script lang="ts">
  import { enhance } from '$app/forms';
  import { SvelteMap } from 'svelte/reactivity';
  import * as m from '$lib/paraglide/messages';
  import { useSelection } from '../../model/context';

  const selection = useSelection();

  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

  const drafts   = new SvelteMap<string, string>();
  const statuses = new SvelteMap<string, SaveStatus>();

  const currentId   = $derived(selection.selectedId);
  const seededDraft = $derived(selection.selected?.notes ?? '');
  const draftValue  = $derived(drafts.get(currentId) ?? seededDraft);
  const status      = $derived(statuses.get(currentId) ?? 'idle');

  let form: HTMLFormElement;
  let savedTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (status === 'saved') {
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(() => {
        if (statuses.get(currentId) === 'saved') statuses.set(currentId, 'idle');
      }, 2000);
    }
  });

  function setDraft(value: string): void {
    drafts.set(currentId, value);
  }

  function save(): void {
    form.requestSubmit();
  }
</script>

<section class="flex flex-col min-h-0 min-w-0">
  <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
    {m.live_execution_notes_label()}
  </div>
  <p class="text-[11.5px] text-ink-3 mb-2">{m.live_execution_notes_hint()}</p>

  <form
    bind:this={form}
    action="?/saveNotes"
    method="POST"
    use:enhance={({ formData }) => {
      const id    = currentId;
      const value = draftValue;
      formData.set('scenarioResultId', id);
      formData.set('notes',            value);
      statuses.set(id, 'saving');
      return async ({ result }) => {
        statuses.set(id, result.type === 'success' ? 'saved' : 'error');
      };
    }}
    hidden
  ></form>

  <textarea
    class="w-full flex-1 min-h-[88px] px-3 py-2 text-[12.5px] leading-relaxed rounded-md bg-surface text-ink-2 placeholder:text-ink-3 border border-border focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent resize-y"
    maxlength={8000}
    value={draftValue}
    oninput={(e) => setDraft(e.currentTarget.value)}
    onblur={save}
    placeholder={m.live_execution_notes_placeholder()}
  ></textarea>

  <div class="mt-1 min-h-[15px] text-[11px] tabular-nums">
    {#if status === 'saving'}
      <span class="text-ink-3">{m.live_execution_notes_saving()}</span>
    {:else if status === 'saved'}
      <span class="text-pass-ink">✓ {m.live_execution_notes_saved()}</span>
    {:else if status === 'error'}
      <span class="text-fail-ink" role="alert">
        ⚠ {m.live_execution_notes_save_error()}
        <button type="button" class="underline hover:opacity-80" onclick={save}>
          {m.live_execution_notes_retry()}
        </button>
      </span>
    {/if}
  </div>
</section>
