<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import CollapsibleSection from '$lib/shared/ui/CollapsibleSection.svelte';
  import { persistedToggle } from '$lib/shared/storage/persisted-toggle.svelte';
  import Row      from './Row.svelte';
  import AddInput from './AddInput.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { ManualScenarioRow } from '$lib/server/features/manual-scenarios';

  type Props = {
    featureId: string;
    initial:   ManualScenarioRow[];
  };

  let { featureId, initial }: Props = $props();

  let error           = $state<string | null>(null);
  const archiving     = new SvelteSet<string>();
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
  onAdd={() => (open.value = true)}
>
  {#if empty}
    <p class="text-sm text-ink-3">{m.manual_scenarios_empty()}</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each visible as row (row.id)}
        <Row
          {row}
          onOptimisticArchive={() => archiving.add(row.id)}
          onArchiveRestore={() => archiving.delete(row.id)}
          onError={(msg) => (error = msg)}
        />
      {/each}
    </ul>
  {/if}

  <AddInput {featureId} onError={(msg) => (error = msg)} />

  {#if error}
    <p class="text-sm text-fail-ink" role="alert">{error}</p>
  {/if}
</CollapsibleSection>
