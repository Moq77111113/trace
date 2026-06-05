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
</script>

<ul class="flex flex-col gap-3">
  {#each tree as node (node.featureName)}
    <li class="bg-surface border border-border rounded-xl overflow-hidden">
      <p class="border-b border-border bg-surface-2 px-4 py-2.5 text-[12.5px] font-medium text-ink">
        {node.featureName}
      </p>
      <ul class="flex flex-col">
        {#each node.scenarios as scenario (scenario.ref)}
          <li class="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] border-t border-border first:border-t-0">
            <span class="text-ink truncate">{scenario.name}</span>
            <span class="flex items-center gap-2 text-[11px] text-ink-3 shrink-0">
              <span class="tabular-nums">{scenario.steps.length} step{scenario.steps.length === 1 ? '' : 's'}</span>
              {#if collisions.get(scenario.ref)}
                <span class="rounded-md bg-flake-soft px-1.5 py-0.5 text-flake-ink">name already exists</span>
              {/if}
              <select
                value={decisions[scenario.ref]}
                onchange={(event) => ondecision(scenario.ref, event.currentTarget.value as Decision)}
                class="h-[26px] px-2 text-[12px] rounded-md bg-surface text-ink border border-border hover:border-border-strong focus:border-accent focus:outline-none cursor-pointer"
              >
                {#each DECISION_OPTIONS as option (option.value)}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </span>
          </li>
        {/each}
      </ul>
    </li>
  {/each}
</ul>
