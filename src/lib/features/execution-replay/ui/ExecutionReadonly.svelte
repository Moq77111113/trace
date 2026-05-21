<script lang="ts">
  import { untrack } from 'svelte';
  import ScenarioSidebar         from '$lib/entities/execution/ui/ScenarioSidebar.svelte';
  import ExecutionReadonlyHeader from './ExecutionReadonlyHeader.svelte';
  import ReplayScenarioPanel     from './scenario/ReplayScenarioPanel.svelte';
  import SnapshotModal           from './SnapshotModal.svelte';
  import type { ExecutionPageData } from '$lib/server/executions/read/queries';

  type Props = { data: NonNullable<ExecutionPageData> };
  let { data }: Props = $props();

  let selectedId   = $state(untrack(() => data.scenarios[0]?.id ?? ''));
  let showSnapshot = $state(false);

  const selected            = $derived(data.scenarios.find((s) => s.id === selectedId));
  const selectedAttachments = $derived(selected ? data.attachmentsByScenario[selected.id] ?? [] : []);
  const failedCount         = $derived(data.scenarios.filter((s) => s.status === 'FAILED').length);
</script>

<section class="grid grid-rows-[auto_1fr] min-h-0 flex-1">
  <ExecutionReadonlyHeader
    featureName={data.feature.name}
    featureCode={`${data.project.codePrefix}-${data.feature.codeSeq}`}
    projectSlug={data.project.slug}
    featureId={data.feature.id}
    status={data.execution.status}
    executionId={data.execution.id}
    source={data.execution.source}
    environment={data.execution.environment}
    startedAt={data.execution.startedAt}
    finishedAt={data.execution.finishedAt}
    executedBy={data.execution.executedBy}
    {failedCount}
    onSnapshot={() => (showSnapshot = true)}
  />

  <div class="grid grid-cols-[360px_1fr] min-h-0 max-lg:grid-cols-[280px_1fr] max-md:grid-cols-[1fr] max-md:grid-rows-[auto_1fr]">
    <aside class="border-r border-border flex flex-col min-h-0 bg-bg max-md:border-r-0 max-md:border-b max-md:max-h-[38vh]">
      <header class="px-3.5 py-2.5 border-b border-border flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        <span>Scenarios</span>
        <span class="ml-auto text-ink-2 text-[11px] normal-case tabular-nums tracking-normal">{data.scenarios.length}</span>
      </header>

      <ScenarioSidebar
        scenarios={data.scenarios}
        {selectedId}
        onSelect={(id) => (selectedId = id)}
      />
    </aside>

    <article class="overflow-auto min-h-0 px-5 py-4 max-md:px-3.5">
      {#if selected}
        <ReplayScenarioPanel
          scenario={selected}
          attachments={selectedAttachments}
          featureContentAtStart={data.execution.featureContentAtStart}
        />
      {/if}
    </article>
  </div>
</section>

<SnapshotModal
  open={showSnapshot}
  onOpenChange={(v) => (showSnapshot = v)}
  content={data.execution.featureContentAtStart}
/>
