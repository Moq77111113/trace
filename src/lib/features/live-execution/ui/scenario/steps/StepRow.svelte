<script lang="ts" module>
  export type Step = {
    id:               string;
    scenarioResultId: string;
    keyword:          string | null;
    text:             string;
    expected:         string | null;
    verdict:          string;
    note:             string | null;
  };
</script>

<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Status from '$lib/shared/ui/Status.svelte';
  import Gate   from '$lib/shared/authz/Gate.svelte';
  import * as m from '$lib/paraglide/messages';
  import { highlightStepText } from '$lib/shared/gherkin/highlight';
  import { stepStatusFor }     from '$lib/entities/execution/lib/format';
  import { useSelection, type Verdict } from '../../../model/context';
  import { optimisticMarkStep }         from '../../../model/scenario-marking';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import StepNote     from './StepNote.svelte';
  import StepEvidenceUpload from './StepEvidenceUpload.svelte';

  type Props = { step: Step };
  let { step }: Props = $props();

  const selection = useSelection();

  let saveError = $state<string | null>(null);
  let open      = $state(false);
  let markForm: HTMLFormElement;

  function isVerdict(v: string): v is Verdict {
    return v === 'PASSED' || v === 'FAILED' || v === 'SKIPPED';
  }

  function clickVerdict(verdict: Verdict): void {
    markForm.querySelector<HTMLButtonElement>(`button[value="${verdict}"]`)?.click();
  }
</script>

<li class="px-2 py-1.5 rounded-md hover:bg-surface-2">
  <div class="grid grid-cols-[14px_auto_1fr] gap-x-2 items-baseline">
    <Status kind={stepStatusFor(step.verdict)} size={12} class="self-center" />
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
    <div class="grid grid-cols-[auto_1fr] gap-x-2 items-baseline mt-0.5 ml-[22px]">
      <span class="font-mono text-[11px] font-semibold text-ink-3 tabular-nums w-[44px]">{m.manual_step_expected()}</span>
      <span class="text-[12px] text-ink-3 leading-relaxed">{step.expected}</span>
    </div>
  {/if}

  <div class="ml-[22px] mt-1.5 flex items-center gap-2 flex-wrap">
    <form
      bind:this={markForm}
      action="?/markStep"
      method="POST"
      use:enhance={({ formData }) => {
        const verdict = formData.get('verdict');
        if (typeof verdict !== 'string' || !isVerdict(verdict)) return;
        formData.set('scenarioResultStepId', step.id);
        saveError = null;
        const rollback = optimisticMarkStep(selection, step.id, verdict);
        return async ({ result }) => {
          if (result.type === 'failure' || result.type === 'error') {
            rollback();
            saveError = failureMessage(result, 'Save failed');
          }
        };
      }}
      hidden
    >
      <button type="submit" name="verdict" value="PASSED">{m.live_step_pass()}</button>
      <button type="submit" name="verdict" value="FAILED">{m.live_step_fail()}</button>
      <button type="submit" name="verdict" value="SKIPPED">{m.live_step_skip()}</button>
    </form>

    <Gate can="execution.run" disable>
      <Button type="button" variant="pass" size="sm" onclick={() => clickVerdict('PASSED')}>{m.live_step_pass()}</Button>
      <Button type="button" variant="fail" size="sm" onclick={() => clickVerdict('FAILED')}>{m.live_step_fail()}</Button>
      <Button type="button" variant="skip" size="sm" onclick={() => clickVerdict('SKIPPED')}>{m.live_step_skip()}</Button>
    </Gate>

    <button
      type="button"
      class="text-[11.5px] text-ink-3 underline hover:text-ink-2"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      {open ? '−' : '+'}
    </button>

    {#if saveError}
      <span role="alert" class="text-fail-ink text-[11px]">⚠ {saveError}</span>
    {/if}
  </div>

  {#if open}
    <div class="ml-[22px] mt-1.5 flex flex-col gap-2">
      <StepNote {step} />
      <StepEvidenceUpload {step} />
    </div>
  {/if}
</li>
