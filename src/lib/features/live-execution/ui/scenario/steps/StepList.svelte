<script lang="ts">
  import StepRow, { type Step } from './StepRow.svelte';
  type Props = { steps: Step[] };
  let { steps }: Props = $props();
</script>

{#if steps.length > 0}
  <ol class="m-0 p-0 list-none flex flex-col gap-px">
    {#each steps as step (step.id)}
      <StepRow {step} />
    {/each}
  </ol>
{/if}
