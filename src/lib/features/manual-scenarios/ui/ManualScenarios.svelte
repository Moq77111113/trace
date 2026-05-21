<script lang="ts">
  import { untrack } from 'svelte';
  import CollapsibleSection from '$lib/shared/ui/CollapsibleSection.svelte';
  import { persistedToggle } from '$lib/shared/storage/persisted-toggle.svelte';
  import Row      from './Row.svelte';
  import AddInput from './AddInput.svelte';
  import { ManualScenariosController } from '../model/controller.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { ManualScenarioRow } from '../api/client';

  type Props = {
    featureId: string;
    initial:   ManualScenarioRow[];
  };

  let { featureId, initial }: Props = $props();

  const ctrl = untrack(() => new ManualScenariosController(featureId, initial));

  const open = untrack(() =>
    persistedToggle(`feature-editor-manual-scenarios:${featureId}`, initial.length > 0, 'session'),
  );
</script>

<CollapsibleSection
  title={m.manual_scenarios_title()}
  subtitle={m.manual_scenarios_subtitle()}
  bind:open={open.value}
  empty={ctrl.empty && !open.value}
  addLabel={m.manual_scenarios_add()}
  onAdd={() => (open.value = true)}
>
  {#if ctrl.empty}
    <p class="text-sm text-ink-3">{m.manual_scenarios_empty()}</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each ctrl.rows as row (row.id)}
        <Row
          {row}
          onRename={(name) => ctrl.rename(row.id, name)}
          onArchive={() => ctrl.archive(row.id)}
        />
      {/each}
    </ul>
  {/if}

  <AddInput saving={ctrl.saving} onAdd={(name) => ctrl.add(name)} />

  {#if ctrl.error}
    <p class="text-sm text-fail-ink" role="alert">{ctrl.error}</p>
  {/if}
</CollapsibleSection>
