<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import type { ScenarioNotesEditor } from '../model/notes-editor.svelte';

  type Props = { notes: ScenarioNotesEditor };

  let { notes }: Props = $props();

  let savedTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (notes.status === 'saved') {
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(() => {
        if (notes.status === 'saved') notes.status = 'idle';
      }, 2000);
    }
  });
</script>

<section class="flex flex-col min-h-0 min-w-0">
  <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
    {m.live_execution_notes_label()}
  </div>
  <p class="text-[11.5px] text-ink-3 mb-2">{m.live_execution_notes_hint()}</p>

  <textarea
    class="w-full flex-1 min-h-[88px] px-3 py-2 text-[12.5px] leading-relaxed rounded-md bg-surface text-ink-2 placeholder:text-ink-3 border border-border focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent resize-y"
    maxlength={8000}
    bind:value={notes.draft}
    onblur={notes.flush}
    placeholder={m.live_execution_notes_placeholder()}
  ></textarea>

  <div class="mt-1 min-h-[15px] text-[11px] tabular-nums">
    {#if notes.status === 'saving'}
      <span class="text-ink-3">{m.live_execution_notes_saving()}</span>
    {:else if notes.status === 'saved'}
      <span class="text-pass-ink">✓ {m.live_execution_notes_saved()}</span>
    {:else if notes.status === 'error'}
      <span class="text-fail-ink" role="alert">
        ⚠ {m.live_execution_notes_save_error()}
        <button type="button" class="underline hover:opacity-80" onclick={notes.flush}>
          {m.live_execution_notes_retry()}
        </button>
      </span>
    {/if}
  </div>
</section>
