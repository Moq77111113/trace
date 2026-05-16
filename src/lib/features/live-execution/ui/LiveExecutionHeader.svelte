<script lang="ts">
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import Button from '$lib/shared/ui/Button.svelte';
  import Kbd    from '$lib/shared/ui/Kbd.svelte';
  import Status from '$lib/shared/ui/Status.svelte';
  import type { ScenarioSelection } from '../model/selection.svelte';
  import type { TerminalFlow }      from '../model/terminal-flow.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    selection:   ScenarioSelection;
    terminal:    TerminalFlow;
    featureName: string;
    executionId: string;
    source:      string;
    environment: string | null;
    startedAt:   Date | string;
    executedBy:  string;
    onFinish:    () => void;
  };

  let { selection, terminal, featureName, executionId, source, environment, startedAt, executedBy, onFinish }: Props = $props();

  const progressPct = $derived(
    selection.counts.total === 0
      ? 0
      : Math.round((selection.counts.done / selection.counts.total) * 100)
  );

  const passedCount  = $derived(selection.scenarios.filter((s) => s.status === 'PASSED').length);
  const failedCount  = $derived(selection.scenarios.filter((s) => s.status === 'FAILED').length);
  const skippedCount = $derived(selection.scenarios.filter((s) => s.status === 'SKIPPED').length);

  function formatStarted(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<header class="flex flex-col gap-2.5 px-5 py-3.5 border-b border-border bg-bg max-md:px-3.5 max-md:py-3">
  <div class="flex items-center gap-3.5 flex-wrap">
    <div class="flex items-center gap-2.5">
      <Status kind="running" size={16} />
      <h1 class="text-[16px] font-semibold tracking-tight m-0 max-md:text-[14px]">{featureName}</h1>
      <Pill kind="running">running</Pill>
    </div>

    <div class="flex items-center gap-3 text-[12px] text-ink-3 tabular-nums flex-wrap">
      <span class="font-mono text-ink-2 max-md:hidden">#{executionId.slice(0, 8)}</span>
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute max-md:hidden"></span>
      <span class="font-mono">{source}</span>
      {#if environment}
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
        <span class="text-ink-2 font-medium">{environment}</span>
      {/if}
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute max-md:hidden"></span>
      <span>started {formatStarted(startedAt)}</span>
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute max-md:hidden"></span>
      <span>{executedBy}</span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <Button variant="danger" onclick={terminal.requestAbort} disabled={terminal.aborting}>
        {terminal.aborting ? m.execution_abort_aborting() : m.execution_abort_cta()}
      </Button>
      <Button onclick={onFinish}>
        Finish run <Kbd>⌘↵</Kbd>
      </Button>
    </div>
    {#if terminal.abortError}
      <span class="text-[12px] text-fail-ink" role="alert">{terminal.abortError}</span>
    {/if}
  </div>

  <div class="flex items-center gap-3.5">
    <div class="flex flex-1 h-1 rounded-sm bg-surface-2 overflow-hidden">
      <span class="block h-full bg-pass" style:width="{selection.counts.total > 0 ? (passedCount / selection.counts.total) * 100 : 0}%"></span>
      <span class="block h-full bg-fail" style:width="{selection.counts.total > 0 ? (failedCount / selection.counts.total) * 100 : 0}%"></span>
      <span class="block h-full bg-skip" style:width="{selection.counts.total > 0 ? (skippedCount / selection.counts.total) * 100 : 0}%"></span>
    </div>
    <div class="text-[11.5px] text-ink-3 tabular-nums">
      <b class="text-ink font-semibold">{selection.counts.done}</b>
      <span> / </span>
      <span>{selection.counts.total}</span>
      <span class="ml-1">· {progressPct}%</span>
    </div>
  </div>
</header>
