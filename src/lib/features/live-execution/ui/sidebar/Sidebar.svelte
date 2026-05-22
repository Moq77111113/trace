<script lang="ts">
  import ScenarioSidebar from '$lib/entities/execution/ui/ScenarioSidebar.svelte';
  import ScenarioFilterTabs from './ScenarioFilterTabs.svelte';
  import ShortcutsFooter from './ShortcutsFooter.svelte';
  import { useSelection } from '../../model/context';

  const selection = useSelection();
</script>

<aside class="border-r border-border flex flex-col min-h-0 bg-bg max-md:border-r-0 max-md:border-b max-md:max-h-[38vh]">
  <header class="px-3.5 py-2.5 border-b border-border flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
    <span>Scenarios</span>
    <span class="ml-auto text-ink-2 text-[11px] normal-case tabular-nums tracking-normal">
      {selection.counts.done} / {selection.counts.total}
    </span>
  </header>

  <ScenarioFilterTabs />

  <ScenarioSidebar
    scenarios={selection.visibleScenarios}
    selectedId={selection.selectedId}
    onSelect={selection.select}
  />

  <ShortcutsFooter />
</aside>
