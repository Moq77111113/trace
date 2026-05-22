<script lang="ts">
  import { untrack } from 'svelte';
  import Header              from './header/Header.svelte';
  import Sidebar             from './sidebar/Sidebar.svelte';
  import ScenarioPanel       from './scenario/ScenarioPanel.svelte';
  import SelectionShortcuts  from './SelectionShortcuts.svelte';
  import { ScenarioSelection } from '../model/selection.svelte';
  import { provideSelection } from '../model/context';
  import type { ExecutionPageData } from '$lib/server/executions/read/queries';

  type Props = { data: NonNullable<ExecutionPageData> };
  let { data }: Props = $props();

  const selection = untrack(() => new ScenarioSelection(data.scenarios));
  provideSelection(selection);
</script>

<section class="grid grid-rows-[auto_1fr] min-h-0 flex-1">
  <Header
    featureName={data.feature.name}
    featureCode={`${data.project.codePrefix}-${data.feature.codeSeq}`}
    executionId={data.execution.id}
    source={data.execution.source}
    environment={data.execution.environment}
    startedAt={data.execution.startedAt}
    executedBy={data.execution.executedBy}
  />

  <div class="grid grid-cols-[360px_1fr] min-h-0 max-lg:grid-cols-[280px_1fr] max-md:grid-cols-[1fr] max-md:grid-rows-[auto_1fr]">
    <Sidebar />

    <article class="grid grid-rows-[auto_1fr_auto] min-h-0 bg-bg">
      <ScenarioPanel featureContentAtStart={data.execution.featureContentAtStart} />
    </article>
  </div>
</section>

<SelectionShortcuts />
