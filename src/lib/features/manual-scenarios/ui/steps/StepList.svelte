<script lang="ts">
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import StepRow from './StepRow.svelte';
  import AddStepInput from './AddStepInput.svelte';
  import type { ManualScenarioStepRow } from '$lib/server/features/manual-scenario-steps';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    scenarioId: string;
    steps:      ManualScenarioStepRow[];
    readonly:   boolean;
  };

  let { scenarioId, steps, readonly }: Props = $props();

  let error        = $state<string | null>(null);
  const removing   = new SvelteSet<string>();
  let dragId       = $state('');
  let pendingOrder = $state<string[] | null>(null);
  let reorderForm  = $state<HTMLFormElement>();

  const visible = $derived(steps.filter((s) => !removing.has(s.id)));
  const order   = $derived(pendingOrder ?? visible.map((s) => s.id));

  function onDragStart(id: string): void { dragId = id; }

  async function onDrop(targetId: string): Promise<void> {
    if (readonly || !dragId || dragId === targetId) return;
    const next = visible.map((s) => s.id).filter((id) => id !== dragId);
    next.splice(next.indexOf(targetId), 0, dragId);
    pendingOrder = next;
    dragId = '';
    await tick();
    reorderForm?.requestSubmit();
  }
</script>

<div class="flex flex-col gap-2 pl-3 border-l border-border">
  {#if error}
    <p class="text-[11.5px] text-fail-ink">{error}</p>
  {/if}

  {#if visible.length === 0}
    <p class="text-[11.5px] text-ink-3 italic">{m.manual_steps_empty()}</p>
  {/if}

  {#each order as id (id)}
    {@const step = visible.find((s) => s.id === id)}
    {#if step}
      <div ondragover={(e) => e.preventDefault()} ondrop={() => onDrop(step.id)} role="presentation">
        <div ondragstart={() => onDragStart(step.id)} role="presentation">
          <StepRow
            {step}
            {readonly}
            onError={(msg) => (error = msg)}
            onOptimisticRemove={() => removing.add(step.id)}
            onRemoveRestore={() => removing.delete(step.id)}
          />
        </div>
      </div>
    {/if}
  {/each}

  {#if !readonly}
    <AddStepInput {scenarioId} onError={(msg) => (error = msg)} />
  {/if}
</div>

<form
  bind:this={reorderForm}
  method="POST"
  action="?/reorderSteps"
  hidden
  use:enhance={() =>
    async ({ update }) => {
      await update();
      pendingOrder = null;
    }}
>
  <input type="hidden" name="scenarioId" value={scenarioId} />
  {#each order as id (id)}
    <input type="hidden" name="order" value={id} />
  {/each}
</form>
