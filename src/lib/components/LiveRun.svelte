<script lang="ts">
  import { untrack } from 'svelte';
  import Badge    from '$lib/components/ui/Badge.svelte';
  import Button   from '$lib/components/ui/Button.svelte';
  import DropZone from '$lib/components/ui/DropZone.svelte';
  import Kbd      from '$lib/components/ui/Kbd.svelte';
  import Modal    from '$lib/components/ui/Modal.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import { LiveRunController } from '$lib/runs/live-run.svelte';
  import {
    formatScenarioDuration,
    isTypingTarget,
    statusBadgeVariant,
    statusIcon,
  } from '$lib/runs/format';
  import type { RunPageData } from '$lib/server/runs/queries';

  type Props = { data: NonNullable<RunPageData> };
  let { data }: Props = $props();

  const controller = untrack(() => new LiveRunController(data));

  let finishForm: HTMLFormElement | undefined = $state();

  function submitFinish(): void {
    finishForm?.requestSubmit();
  }

  function onFinishClick(): void {
    if (controller.requestFinish()) submitFinish();
  }

  function onConfirmFinish(): void {
    controller.cancelConfirmFinish();
    submitFinish();
  }

  $effect(() => {
    function onKey(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        submitFinish();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === 'p') { controller.markPassed();  return; }
      if (key === 'f') { controller.markFailed();  return; }
      if (key === 's') { controller.markSkipped(); return; }

      if (event.key === 'ArrowDown') { event.preventDefault(); controller.moveDown(); return; }
      if (event.key === 'ArrowUp')   { event.preventDefault(); controller.moveUp();   return; }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<header class="flex justify-between items-center mb-4">
  <div class="flex items-center gap-3">
    <h2 class="text-lg font-semibold">{data.feature.name}</h2>
    <Badge variant="running">RUNNING</Badge>
  </div>
  <Button onclick={onFinishClick}>Finish run <Kbd>⌘↵</Kbd></Button>
</header>

<section class="grid grid-cols-[40%_1fr] min-h-[440px] border border-surface-700 rounded-md overflow-hidden bg-surface-900">
  <aside class="border-r border-surface-700">
    <header class="px-4 py-3 text-xs uppercase text-surface-400 tracking-wide border-b border-surface-700">
      Scenarios · {controller.counts.done}/{controller.counts.total}
    </header>

    <ul>
      {#each controller.scenarios as scenario (scenario.id)}
        <li>
          <button
            type="button"
            class="w-full flex justify-between items-center px-4 py-2 text-sm border-b border-surface-700 text-left hover:bg-surface-800 transition"
            class:bg-surface-800={scenario.id === controller.selectedId}
            onclick={() => controller.selectScenario(scenario.id)}
          >
            <span class="flex items-center gap-2">
              <span class="text-surface-400">{statusIcon(scenario.status)}</span>
              <span>{scenario.scenarioName}</span>
            </span>
            <span class="text-xs text-surface-400">{formatScenarioDuration(scenario.durationMs)}</span>
          </button>
        </li>
      {/each}
    </ul>

    <footer class="px-4 py-3 text-xs text-surface-400">
      <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate · <Kbd>P</Kbd> pass · <Kbd>F</Kbd> fail · <Kbd>S</Kbd> skip
    </footer>
  </aside>

  <article class="p-6">
    {#if controller.selected}
      <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Active scenario</div>
      <h3 class="text-base font-semibold mb-4">Scenario: {controller.selected.scenarioName}</h3>

      <div class="mb-4">
        <Badge variant={statusBadgeVariant(controller.selected.status)}>{controller.selected.status}</Badge>
      </div>

      {#if controller.saveError}
        <p class="mb-3 text-xs text-state-failed" role="alert">{controller.saveError}</p>
      {/if}

      <div class="flex gap-2">
        <Button variant="primary"   onclick={controller.markPassed}>✓ Pass <Kbd>P</Kbd></Button>
        <Button variant="danger"    onclick={controller.markFailed}>✗ Fail <Kbd>F</Kbd></Button>
        <Button variant="secondary" onclick={controller.markSkipped}>↷ Skip <Kbd>S</Kbd></Button>
      </div>

      {#if controller.selected.status === 'FAILED'}
        <div class="mt-4">
          <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Attachments</div>

          <DropZone onDrop={controller.uploadFiles}>
            📎 Drop screenshots, logs, or files here · or click to browse
            {#if controller.uploading}<span class="block mt-1 text-xs">Uploading…</span>{/if}
          </DropZone>

          {#if controller.uploadError}
            <p class="mt-2 text-xs text-state-failed" role="alert">{controller.uploadError}</p>
          {/if}

          {#if controller.attachmentsOfSelected.length > 0}
            <ul class="mt-3 space-y-1 text-sm">
              {#each controller.attachmentsOfSelected as attachment (attachment.id)}
                <li class="px-3 py-1.5 bg-surface-800 border border-surface-700 rounded flex justify-between items-center">
                  <span>📎 {attachment.filename}</span>
                  <span class="text-xs text-surface-400">{(attachment.sizeBytes / 1024).toFixed(1)} KB</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}

      <div class="mt-6">
        <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Notes</div>
        <Textarea
          rows={3}
          bind:value={controller.notes}
          onblur={controller.flushNotes}
          placeholder="Observations, repro steps, browser info…"
        />
        {#if controller.notesError}
          <p class="mt-1 text-xs text-state-failed" role="alert">{controller.notesError}</p>
        {/if}
      </div>
    {/if}
  </article>
</section>

<form bind:this={finishForm} method="POST" action="?/finish" class="hidden"></form>

<Modal
  open={controller.confirming}
  onOpenChange={(v) => { if (!v) controller.cancelConfirmFinish(); }}
  title="Finish run with pending scenarios?"
>
  <p class="text-sm">
    <strong class="text-surface-100">{controller.pendingCount}</strong> scenario{controller.pendingCount === 1 ? '' : 's'} still pending.
    They will be marked <strong class="text-surface-100">SKIPPED</strong>.
  </p>

  {#snippet footer()}
    <Button variant="secondary" onclick={controller.cancelConfirmFinish}>Cancel</Button>
    <Button onclick={onConfirmFinish}>Confirm finish</Button>
  {/snippet}
</Modal>
