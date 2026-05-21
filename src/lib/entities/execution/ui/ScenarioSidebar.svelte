<script lang="ts">
  import ScenarioListItem from './ScenarioListItem.svelte';
  import * as m from '$lib/paraglide/messages';

  type Scenario = {
    id:           string;
    scenarioName: string;
    status:       string;
    durationMs:   number | null;
    source:       'GHERKIN' | 'MANUAL';
  };

  type Props = {
    scenarios:  Scenario[];
    selectedId: string | null;
    onSelect:   (id: string) => void;
  };

  let { scenarios, selectedId, onSelect }: Props = $props();

  const gherkin = $derived(scenarios.filter((s) => s.source === 'GHERKIN'));
  const manual  = $derived(scenarios.filter((s) => s.source === 'MANUAL'));
</script>

<ul class="flex-1 overflow-auto py-1 m-0 p-0 list-none">
  {#if gherkin.length > 0}
    <li class="px-3.5 pt-3 pb-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium" aria-hidden="true">
      {m.cockpit_section_automated()}
    </li>
    {#each gherkin as scenario (scenario.id)}
      <ScenarioListItem {scenario} active={scenario.id === selectedId} {onSelect} />
    {/each}
  {/if}

  {#if manual.length > 0}
    <li class="px-3.5 pt-3 pb-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium" aria-hidden="true">
      {m.cockpit_section_manual_checks()}
    </li>
    {#each manual as scenario (scenario.id)}
      <ScenarioListItem {scenario} active={scenario.id === selectedId} {onSelect} />
    {/each}
  {/if}
</ul>
