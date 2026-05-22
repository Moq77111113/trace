<script lang="ts">
  import Button from '$lib/shared/ui/Button.svelte';
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import { invalidateAll } from '$app/navigation';
  import type { ImportState } from '../model/import-state.svelte';

  type Props = { flow: ImportState };
  let { flow }: Props = $props();

  async function importMore(): Promise<void> {
    flow.reset();
    await invalidateAll();
  }
</script>

{#if flow.outcome}
  <div class="bg-surface border border-border rounded-xl p-4 mb-3.5">
    <p class="text-[13px] text-ink flex items-center gap-2 flex-wrap">
      <Pill kind="pass">{flow.outcome.imported} imported</Pill>
      <Pill kind="neutral">{flow.outcome.skipped} skipped</Pill>
      {#if flow.outcome.failed.length > 0}
        <Pill kind="fail">{flow.outcome.failed.length} failed</Pill>
      {/if}
    </p>
    {#if flow.outcome.failed.length > 0}
      <ul class="mt-3 text-[12px] text-ink-3 space-y-1">
        {#each flow.outcome.failed as f (f.rowId)}
          <li><span class="text-fail-ink">·</span> {f.filename} — {f.reason}</li>
        {/each}
      </ul>
    {/if}
  </div>
  <Button variant="secondary" onclick={importMore}>Import more files</Button>
{/if}
