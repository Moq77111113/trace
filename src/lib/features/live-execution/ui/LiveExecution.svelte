<script lang="ts">
  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import ScenarioSidebar       from '$lib/entities/execution/ui/ScenarioSidebar.svelte';
  import LiveExecutionHeader   from './LiveExecutionHeader.svelte';
  import ScenarioFilterTabs    from './ScenarioFilterTabs.svelte';
  import ScenarioPanel         from './ScenarioPanel.svelte';
  import ShortcutsFooter       from './ShortcutsFooter.svelte';
  import FinishConfirmModal    from './FinishConfirmModal.svelte';
  import AbortConfirmModal     from './AbortConfirmModal.svelte';
  import { createLiveExecutionController } from '../model/controller.svelte';
  import { attachLiveExecutionShortcuts }  from '../model/shortcuts';
  import type { ExecutionPageData } from '$lib/server/executions/queries';

  type Props = { data: NonNullable<ExecutionPageData> };
  let { data }: Props = $props();

  const controller = untrack(() => createLiveExecutionController(data));
  const { selection, marking, terminal } = controller;

  let finishForm: HTMLFormElement | undefined = $state();

  function submitFinish(): void { finishForm?.requestSubmit(); }

  function onFinishClick(): void {
    if (terminal.requestFinish()) submitFinish();
  }

  function onConfirmFinish(): void {
    terminal.cancelFinish();
    submitFinish();
  }

  async function onConfirmAbort(): Promise<void> {
    const result = await terminal.abort();
    if (result.ok) await invalidateAll();
  }

  $effect(() => attachLiveExecutionShortcuts(window, {
    onPass:     marking.markPassed,
    onFail:     marking.markFailed,
    onSkip:     marking.markSkipped,
    onJump:     selection.jumpToNextPending,
    onMoveDown: selection.moveDown,
    onMoveUp:   selection.moveUp,
    onFinish:   submitFinish,
  }));
</script>

<section class="grid grid-rows-[auto_1fr] min-h-0 flex-1">
  <LiveExecutionHeader
    {selection}
    {terminal}
    featureName={data.feature.name}
    featureCode={`${data.project.codePrefix}-${data.feature.codeSeq}`}
    executionId={data.execution.id}
    source={data.execution.source}
    environment={data.execution.environment}
    startedAt={data.execution.startedAt}
    executedBy={data.execution.executedBy}
    onFinish={onFinishClick}
  />

  <div class="grid grid-cols-[360px_1fr] min-h-0 max-lg:grid-cols-[280px_1fr] max-md:grid-cols-[1fr] max-md:grid-rows-[auto_1fr]">
    <aside class="border-r border-border flex flex-col min-h-0 bg-bg max-md:border-r-0 max-md:border-b max-md:max-h-[38vh]">
      <header class="px-3.5 py-2.5 border-b border-border flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        <span>Scenarios</span>
        <span class="ml-auto text-ink-2 text-[11px] normal-case tabular-nums tracking-normal">
          {selection.counts.done} / {selection.counts.total}
        </span>
      </header>

      <ScenarioFilterTabs {selection} />

      <ScenarioSidebar
        scenarios={selection.visibleScenarios}
        selectedId={selection.selectedId}
        onSelect={selection.select}
      />

      <ShortcutsFooter />
    </aside>

    <article class="grid grid-rows-[auto_1fr_auto] min-h-0 bg-bg">
      <ScenarioPanel
        {selection}
        {marking}
        notes={controller.notes}
        attachments={controller.attachments}
        featureContentAtStart={data.execution.featureContentAtStart}
      />
    </article>
  </div>
</section>

<form bind:this={finishForm} method="POST" action="?/finish" class="hidden"></form>

<FinishConfirmModal
  open={terminal.confirmingFinish}
  pendingCount={selection.pendingCount}
  onCancel={terminal.cancelFinish}
  onConfirm={onConfirmFinish}
/>

<AbortConfirmModal
  open={terminal.confirmingAbort}
  pendingCount={selection.pendingCount}
  aborting={terminal.aborting}
  onCancel={terminal.cancelAbort}
  onConfirm={onConfirmAbort}
/>
