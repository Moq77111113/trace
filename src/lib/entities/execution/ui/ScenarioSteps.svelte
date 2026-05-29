<script lang="ts">
  import Status from '$lib/shared/ui/Status.svelte';
  import { highlightStepText } from '$lib/shared/gherkin/highlight';
  import { stepStatusFor }     from '$lib/entities/execution/lib/format';
  import type { StepView }     from '$lib/entities/execution/lib/step-view';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    steps:          StepView[];
    scenarioStatus: string;
  };

  let { steps, scenarioStatus }: Props = $props();

  const stepKind = $derived(stepStatusFor(scenarioStatus));
</script>

{#if steps.length > 0}
  <ol class="m-0 p-0 list-none flex flex-col gap-px">
    {#each steps as step, i (i)}
      <li class="px-2 py-1.5 rounded-md hover:bg-surface-2">
        <div class="grid grid-cols-[14px_auto_1fr] gap-x-2 items-baseline">
          <Status kind={stepKind} size={12} class="self-center" />
          <span class="font-mono text-[12px] font-semibold text-ink-2 tabular-nums w-[44px]">{step.keyword ?? ''}</span>
          <span class="text-[12.5px] text-ink-2 leading-relaxed">
            {#each highlightStepText(step.text) as seg, j (j)}
              {#if seg.kind === 'str'}
                <span class="text-pass-ink font-mono">{seg.value}</span>
              {:else if seg.kind === 'num'}
                <span class="text-flake-ink font-mono tabular-nums">{seg.value}</span>
              {:else}
                {seg.value}
              {/if}
            {/each}
          </span>
        </div>
        {#if step.expected}
          <div class="grid grid-cols-[14px_auto_1fr] gap-x-2 items-baseline mt-0.5">
            <span></span>
            <span class="font-mono text-[11px] font-semibold text-ink-3 tabular-nums w-[44px]">{m.manual_step_expected()}</span>
            <span class="text-[12px] text-ink-3 leading-relaxed">{step.expected}</span>
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
