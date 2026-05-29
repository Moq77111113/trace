<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import CollapsibleSection from '$lib/shared/ui/CollapsibleSection.svelte';
  import { persistedToggle } from '$lib/shared/storage/persisted-toggle.svelte';
  import Row      from './Row.svelte';
  import AddInput from './AddInput.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { ManualScenarioRow } from '$lib/server/features/manual-scenarios';
  import type { ManualScenarioStepRow } from '$lib/server/features/manual-scenario-steps';

  type Props = {
    featureId: string;
    initial:   (ManualScenarioRow & { steps: ManualScenarioStepRow[] })[];
    readonly?: boolean;
  };

  let { featureId, initial, readonly = false }: Props = $props();

  let error           = $state<string | null>(null);
  let adding          = $state(false);
  const archiving     = new SvelteSet<string>();
  const expandedIds   = new SvelteSet<string>();
  const visible       = $derived(initial.filter((r) => !archiving.has(r.id)));
  const empty         = $derived(visible.length === 0);

  const open = untrack(() =>
    persistedToggle(`feature-editor-manual-scenarios:${featureId}`, initial.length > 0, 'session'),
  );
</script>

<CollapsibleSection
  title={m.manual_scenarios_title()}
  subtitle={m.manual_scenarios_subtitle()}
  bind:open={open.value}
  empty={empty && !open.value}
  addLabel={m.manual_scenarios_add()}
  onAdd={() => {
    if (readonly) return;
    open.value = true;
    adding = true;
  }}
>
  {#if empty}
    <p class="text-sm text-ink-3">{m.manual_scenarios_empty()}</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each visible as row (row.id)}
        <Row
          {row}
          {readonly}
          steps={row.steps}
          expanded={expandedIds.has(row.id)}
          onToggle={() => (expandedIds.has(row.id) ? expandedIds.delete(row.id) : expandedIds.add(row.id))}
          onOptimisticArchive={() => archiving.add(row.id)}
          onArchiveRestore={() => archiving.delete(row.id)}
          onError={(msg) => (error = msg)}
        />
      {/each}
    </ul>
  {/if}

  {#if !readonly}
    {#if adding}
      <AddInput
        {featureId}
        onError={(msg) => (error = msg)}
        onClose={() => (adding = false)}
      />
    {:else}
      <button
        type="button"
        class="w-full rounded-md border border-dashed border-border px-3 py-2 text-[12px] text-ink-3 hover:text-ink hover:border-border-strong"
        onclick={() => (adding = true)}
      >{m.manual_scenarios_add()}</button>
    {/if}
  {/if}

  {#if error}
    <p class="text-sm text-fail-ink" role="alert">{error}</p>
  {/if}
</CollapsibleSection>
