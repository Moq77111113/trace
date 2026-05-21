<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  type Props = { notes: string | null };

  let { notes }: Props = $props();
</script>

<section class="flex flex-col min-h-0 min-w-0">
  <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
    {m.live_execution_notes_label()}
  </div>
  <p class="text-[11.5px] text-ink-3 mb-2">{m.live_execution_notes_hint()}</p>
  {#if notes}
    <div class="text-[12.5px] leading-relaxed text-ink-2 whitespace-pre-wrap">{notes}</div>
  {:else}
    <div class="text-[12px] text-ink-3 italic">{m.live_execution_evidence_empty()}</div>
  {/if}
</section>
