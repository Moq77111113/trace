<script lang="ts">
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import Button from '$lib/shared/ui/Button.svelte';
  import Status from '$lib/shared/ui/Status.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { formatExecutionDuration } from '$lib/entities/execution/lib/format';
  import ExecutionLauncher from '$lib/features/execution-launcher/ui/ExecutionLauncher.svelte';
  import RerunFailedForm   from './RerunFailedForm.svelte';

  type Props = {
    featureName: string;
    featureCode: string;
    projectSlug: string;
    featureId:   string;
    status:      string;
    executionId: string;
    source:      string;
    environment: string | null;
    startedAt:   Date | string;
    finishedAt:  Date | string | null;
    executedBy:  string;
    failedCount: number;
    onSnapshot:  () => void;
  };

  let {
    featureName, featureCode, projectSlug, featureId, status, executionId, source, environment,
    startedAt, finishedAt, executedBy, failedCount, onSnapshot,
  }: Props = $props();

  const runKind = $derived(toStatusKind(status));
</script>

<header class="flex flex-col gap-2.5 px-5 py-3.5 border-b border-border bg-bg max-md:px-3.5">
  <div class="flex items-center gap-3.5 flex-wrap">
    <div class="flex items-center gap-2.5">
      <Status kind={runKind} size={16} />
      <span class="font-mono text-[12px] text-ink-3 tabular-nums">{featureCode}</span>
      <h1 class="text-[16px] font-semibold tracking-tight m-0">{featureName}</h1>
      <Pill kind={runKind}>{status.toLowerCase()}</Pill>
    </div>

    <div class="flex items-center gap-3 text-[12px] text-ink-3 tabular-nums flex-wrap">
      <span class="font-mono text-ink-2">#{executionId.slice(0, 8)}</span>
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
      <span class="font-mono">{source}</span>
      {#if environment}
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
        <span class="text-ink-2 font-medium">{environment}</span>
      {/if}
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
      <span>{new Date(startedAt).toLocaleString()}</span>
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
      <span>{formatExecutionDuration(startedAt, finishedAt)}</span>
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
      <span>{executedBy}</span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <Button variant="secondary" onclick={onSnapshot}>
        <Icon name="Eye" size={13} /> Snapshot
      </Button>
      {#if failedCount > 0}
        <RerunFailedForm {failedCount} />
      {/if}
      <ExecutionLauncher {projectSlug} {featureId} />
    </div>
  </div>
</header>
