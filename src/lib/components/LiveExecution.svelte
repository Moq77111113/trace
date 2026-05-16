<script lang="ts">
  import { untrack } from 'svelte';
  import Pill            from '$lib/components/ui/Pill.svelte';
  import Button          from '$lib/components/ui/Button.svelte';
  import DropZone        from '$lib/components/ui/DropZone.svelte';
  import Kbd             from '$lib/components/ui/Kbd.svelte';
  import Modal           from '$lib/components/ui/Modal.svelte';
  import Status          from '$lib/components/ui/Status.svelte';
  import Icon            from '$lib/components/ui/Icon.svelte';
  import ScenarioSteps   from '$lib/components/ScenarioSteps.svelte';
  import { toStatusKind } from '$lib/components/ui/Status.svelte';
  import { LiveExecutionController } from '$lib/executions/live-execution.svelte';
  import { extractScenarioSteps } from '$lib/gherkin/steps';
  import {
    formatScenarioDuration,
    isTypingTarget
  } from '$lib/executions/format';
  import type { ExecutionPageData } from '$lib/server/executions/queries';

  type Props = { data: NonNullable<ExecutionPageData> };
  let { data }: Props = $props();

  const controller = untrack(() => new LiveExecutionController(data));

  let finishForm: HTMLFormElement | undefined = $state();

  function submitFinish(): void { finishForm?.requestSubmit(); }

  function onFinishClick(): void {
    if (controller.requestFinish()) submitFinish();
  }

  function onConfirmFinish(): void {
    controller.cancelConfirmFinish();
    submitFinish();
  }

  const progressPct = $derived(
    controller.counts.total === 0
      ? 0
      : Math.round((controller.counts.done / controller.counts.total) * 100)
  );

  const selectedSteps = $derived(
    controller.selected
      ? extractScenarioSteps(data.execution.featureContentAtStart, controller.selected.scenarioName)
      : []
  );

  function formatStarted(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

<section class="grid grid-rows-[auto_1fr] min-h-0 flex-1">
  <header class="flex flex-col gap-2.5 px-5 py-3.5 border-b border-border bg-bg max-md:px-3.5 max-md:py-3">
    <div class="flex items-center gap-3.5 flex-wrap">
      <div class="flex items-center gap-2.5">
        <Status kind="running" size={16} />
        <h1 class="text-[16px] font-semibold tracking-tight m-0 max-md:text-[14px]">
          {data.feature.name}
        </h1>
        <Pill kind="running">running</Pill>
      </div>

      <div class="flex items-center gap-3 text-[12px] text-ink-3 tabular-nums flex-wrap">
        <span class="font-mono text-ink-2 max-md:hidden">#{data.execution.id.slice(0, 8)}</span>
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute max-md:hidden"></span>
        <span class="font-mono">{data.execution.source}</span>
        {#if data.execution.environment}
          <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
          <span class="text-ink-2 font-medium">{data.execution.environment}</span>
        {/if}
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute max-md:hidden"></span>
        <span>started {formatStarted(data.execution.startedAt)}</span>
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute max-md:hidden"></span>
        <span>{data.execution.executedBy}</span>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <Button onclick={onFinishClick}>
          Finish run <Kbd>⌘↵</Kbd>
        </Button>
      </div>
    </div>

    <div class="flex items-center gap-3.5">
      <div class="flex flex-1 h-1 rounded-sm bg-surface-2 overflow-hidden">
        <span
          class="block h-full bg-pass"
          style:width="{controller.counts.total > 0 ? (controller.scenarios.filter(s => s.status === 'PASSED').length / controller.counts.total) * 100 : 0}%"
        ></span>
        <span
          class="block h-full bg-fail"
          style:width="{controller.counts.total > 0 ? (controller.scenarios.filter(s => s.status === 'FAILED').length / controller.counts.total) * 100 : 0}%"
        ></span>
        <span
          class="block h-full bg-skip"
          style:width="{controller.counts.total > 0 ? (controller.scenarios.filter(s => s.status === 'SKIPPED').length / controller.counts.total) * 100 : 0}%"
        ></span>
      </div>
      <div class="text-[11.5px] text-ink-3 tabular-nums">
        <b class="text-ink font-semibold">{controller.counts.done}</b>
        <span> / </span>
        <span>{controller.counts.total}</span>
        <span class="ml-1">· {progressPct}%</span>
      </div>
    </div>
  </header>

  <div class="grid grid-cols-[360px_1fr] min-h-0 max-lg:grid-cols-[280px_1fr] max-md:grid-cols-[1fr] max-md:grid-rows-[auto_1fr]">
    <!-- Scenario list -->
    <aside class="border-r border-border flex flex-col min-h-0 bg-bg max-md:border-r-0 max-md:border-b max-md:max-h-[38vh]">
      <header class="px-3.5 py-2.5 border-b border-border flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        <span>Scenarios</span>
        <span class="ml-auto text-ink-2 text-[11px] normal-case tabular-nums tracking-normal">
          {controller.counts.done} / {controller.counts.total}
        </span>
      </header>

      <ul class="flex-1 overflow-auto py-1 m-0 p-0 list-none">
        {#each controller.scenarios as scenario (scenario.id)}
          {@const active = scenario.id === controller.selectedId}
          {@const kind = toStatusKind(scenario.status)}
          <li>
            <button
              type="button"
              class="grid grid-cols-[16px_1fr_auto] gap-2.5 px-3.5 py-2 w-full text-left bg-transparent border-0 cursor-pointer items-start border-l-2 border-transparent hover:bg-surface-2 {active ? 'bg-surface !border-l-accent' : ''}"
              data-s={kind}
              onclick={() => controller.selectScenario(scenario.id)}
            >
              <Status kind={kind} size={14} class="mt-0.5" />
              <div class="min-w-0">
                <div class="text-[13px] font-medium leading-tight {kind === 'skip' || kind === 'pending' ? 'text-ink-3 font-normal' : ''}">
                  {scenario.scenarioName}
                </div>
              </div>
              <span class="text-[11px] text-ink-3 tabular-nums mt-0.5">
                {formatScenarioDuration(scenario.durationMs)}
              </span>
            </button>
          </li>
        {/each}
      </ul>

      <footer class="px-3.5 py-2.5 text-[11px] text-ink-3 flex items-center gap-1.5 border-t border-border">
        <Kbd>↑</Kbd><Kbd>↓</Kbd>
        <span class="ml-1">navigate</span>
        <span class="mx-1.5 text-ink-mute">·</span>
        <Kbd>P</Kbd> <span>pass</span>
        <span class="mx-1.5 text-ink-mute">·</span>
        <Kbd>F</Kbd> <span>fail</span>
        <span class="mx-1.5 text-ink-mute">·</span>
        <Kbd>S</Kbd> <span>skip</span>
      </footer>
    </aside>

    <!-- Scenario detail -->
    <article class="grid grid-rows-[auto_1fr_auto] min-h-0 bg-bg">
      {#if controller.selected}
        {@const kind = toStatusKind(controller.selected.status)}
        <header class="px-5 py-3.5 border-b border-border flex flex-col gap-2 max-md:px-3.5">
          <div class="flex items-center gap-3">
            <Status kind={kind} size={20} />
            <h2 class="text-[15px] font-semibold tracking-tight flex-1 min-w-0 m-0 truncate">
              {controller.selected.scenarioName}
            </h2>
            <Pill kind={kind}>{controller.selected.status.toLowerCase()}</Pill>
          </div>
          <div class="text-[11.5px] text-ink-3 flex items-center gap-2.5 tabular-nums">
            <span>Scenario</span>
            <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
            <span>{formatScenarioDuration(controller.selected.durationMs) || 'not run yet'}</span>
          </div>
        </header>

        <section class="overflow-auto px-5 py-4 min-h-0 max-md:px-3.5">
          {#if selectedSteps.length > 0}
            <div class="mb-3">
              <ScenarioSteps steps={selectedSteps} scenarioStatus={controller.selected.status} />
            </div>
          {/if}

          {#if controller.selected.errorMessage}
            <div class="px-3 py-2.5 bg-fail-soft border border-fail/30 rounded-md text-[11.5px] text-fail-ink font-mono whitespace-pre-wrap leading-relaxed">
              <b class="font-semibold">Error</b><br />
              {controller.selected.errorMessage}
            </div>
          {/if}

          {#if controller.saveError}
            <p class="mt-3 text-[12px] text-fail-ink" role="alert">{controller.saveError}</p>
          {/if}

          {#if controller.selected.status === 'FAILED'}
            <div class="mt-4 pt-4 border-t border-dashed border-border">
              <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium flex items-center gap-1.5">
                <Icon name="Paperclip" size={11} />
                <span>Evidence</span>
              </div>

              {#if controller.attachmentsOfSelected.length > 0}
                <ul class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 list-none m-0 p-0 mb-2">
                  {#each controller.attachmentsOfSelected as attachment (attachment.id)}
                    <li class="border border-border rounded-md overflow-hidden bg-surface">
                      <div class="h-20 bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_8px,var(--surface)_8px_16px)] grid place-items-center text-ink-3 font-mono text-[10.5px] border-b border-border">
                        {attachment.mimeType.split('/')[0]}
                      </div>
                      <div class="px-2 py-1.5 text-[11px]">
                        <div class="font-medium truncate">{attachment.filename}</div>
                        <div class="text-ink-3 mt-0.5 tabular-nums">{(attachment.sizeBytes / 1024).toFixed(1)} KB</div>
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}

              <DropZone onDrop={controller.uploadFiles}>
                <Icon name="Upload" size={14} />
                <span class="ml-1.5">Drop screenshots, logs, or files — or click to browse</span>
                {#if controller.uploading}<span class="block mt-1 text-[11px]">Uploading…</span>{/if}
              </DropZone>

              {#if controller.uploadError}
                <p class="mt-2 text-[11.5px] text-fail-ink" role="alert">{controller.uploadError}</p>
              {/if}
            </div>
          {/if}

          <div class="mt-4 pt-4 border-t border-dashed border-border">
            <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">Notes</div>
            <textarea
              class="w-full min-h-14 px-3 py-2 text-[12.5px] leading-relaxed rounded-md bg-surface text-ink-2 placeholder:text-ink-3 border border-border focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent resize-y"
              rows={3}
              bind:value={controller.notes}
              onblur={controller.flushNotes}
              placeholder="Observations, repro steps, browser info…"
            ></textarea>
            {#if controller.notesError}
              <p class="mt-1 text-[11.5px] text-fail-ink" role="alert">{controller.notesError}</p>
            {/if}
          </div>
        </section>

        <footer class="border-t border-border px-5 py-3 flex items-center gap-2 bg-bg max-md:px-3.5 max-md:flex-wrap">
          <Button variant="pass" onclick={controller.markPassed}>
            <Status kind="pass" size={12} /> Pass <Kbd>P</Kbd>
          </Button>
          <Button variant="fail" onclick={controller.markFailed}>
            <Status kind="fail" size={12} /> Fail <Kbd>F</Kbd>
          </Button>
          <Button variant="skip" onclick={controller.markSkipped}>
            <Status kind="skip" size={12} /> Skip <Kbd>S</Kbd>
          </Button>
          <div class="flex-1"></div>
          <span class="text-[11.5px] text-ink-3 max-md:hidden">
            <Kbd>↑</Kbd><Kbd>↓</Kbd> next/prev
          </span>
        </footer>
      {/if}
    </article>
  </div>
</section>

<form bind:this={finishForm} method="POST" action="?/finish" class="hidden"></form>

<Modal
  open={controller.confirming}
  onOpenChange={(v) => { if (!v) controller.cancelConfirmFinish(); }}
  title="Finish run with pending scenarios?"
>
  <p class="text-[13px]">
    <strong class="text-ink font-semibold">{controller.pendingCount}</strong>
    scenario{controller.pendingCount === 1 ? '' : 's'} still pending.
    They will be marked <strong class="text-ink font-semibold">SKIPPED</strong>.
  </p>

  {#snippet footer()}
    <Button variant="ghost" onclick={controller.cancelConfirmFinish}>Cancel</Button>
    <Button variant="primary" onclick={onConfirmFinish}>Confirm finish</Button>
  {/snippet}
</Modal>
