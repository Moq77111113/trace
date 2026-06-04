<script lang="ts">
  import StepRow from './StepRow.svelte';
  type Step = { id: string; scenarioResultId: string; keyword: string | null; text: string; expected: string | null; verdict: string; note: string | null };
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
