<script lang="ts">
  import type { GroupingNode } from '$lib/shared/import-manual/grouping';
  import type { ScenarioDecision as Decision } from '$lib/shared/import-manual/ir';

  type Props = {
    tree:       GroupingNode[];
    collisions: Map<string, boolean>;
    decisions:  Record<string, Decision>;
    ondecision: (ref: string, decision: Decision) => void;
  };

  let { tree, collisions, decisions, ondecision }: Props = $props();

  const DECISION_OPTIONS: { value: Decision; label: string }[] = [
    { value: 'import', label: 'Import' },
    { value: 'skip',   label: 'Skip'   },
    { value: 'rename', label: 'Rename' },
  ];

  const featureCount  = $derived(tree.length);
  const scenarioCount = $derived(tree.reduce((sum, node) => sum + node.scenarios.length, 0));
  const stepCount     = $derived(
    tree.reduce((sum, node) => sum + node.scenarios.reduce((s, scenario) => s + scenario.steps.length, 0), 0),
  );

  function plural(count: number): string {
    return count === 1 ? '' : 's';
  }
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] text-ink-3 tabular-nums">
    {featureCount} feature{plural(featureCount)} · {scenarioCount} scenario{plural(scenarioCount)} · {stepCount} step{plural(stepCount)}
  </p>

  <ul class="flex flex-col gap-3">
    {#each tree as node (node.featureName)}
      <li class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="border-b border-border bg-surface-2 px-4 py-2.5 flex items-center gap-2.5">
          <span class="text-[10px] uppercase tracking-wide bg-surface text-ink-3 rounded px-1.5 py-0.5 shrink-0">Feature</span>
          <span class="text-[13px] font-medium text-ink truncate">{node.featureName}</span>
          <span class="text-[11px] text-ink-3 tabular-nums shrink-0 ml-auto">{node.scenarios.length} scenario{plural(node.scenarios.length)}</span>
        </div>

        <ul class="flex flex-col">
          {#each node.scenarios as scenario (scenario.ref)}
            <li class="px-4 py-3 border-t border-border first:border-t-0 flex flex-col gap-2">
              <div class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-2 min-w-0">
                  <span class="text-[10px] uppercase tracking-wide bg-surface-2 text-ink-3 rounded px-1.5 py-0.5 shrink-0">Scenario</span>
                  <span class="text-[13px] text-ink truncate">{scenario.name}</span>
                  {#if collisions.get(scenario.ref)}
                    <span class="rounded-md bg-flake-soft px-1.5 py-0.5 text-[11px] text-flake-ink shrink-0">name already exists</span>
                  {/if}
                </span>
                <select
                  value={decisions[scenario.ref]}
                  onchange={(event) => ondecision(scenario.ref, event.currentTarget.value as Decision)}
                  class="h-[26px] px-2 text-[12px] rounded-md bg-surface text-ink border border-border hover:border-border-strong focus:border-accent focus:outline-none cursor-pointer shrink-0"
                >
                  {#each DECISION_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </div>

              {#if scenario.steps.length === 0}
                <p class="pl-1 text-[12px] text-ink-3 italic">no steps</p>
              {:else}
                <ol class="flex flex-col gap-1 pl-1">
                  {#each scenario.steps as step, i (i)}
                    <li class="text-[12px] text-ink tabular-nums">
                      <span class="text-ink-3">{i + 1}.</span>
                      <span>{step.action}</span>
                      {#if step.expected}
                        <span class="text-ink-3"> → {step.expected}</span>
                      {/if}
                    </li>
                  {/each}
                </ol>
              {/if}
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ul>
</div>
