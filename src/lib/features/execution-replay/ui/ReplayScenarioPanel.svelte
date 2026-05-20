<script lang="ts">
  import Pill                  from '$lib/shared/ui/Pill.svelte';
  import Status                from '$lib/shared/ui/Status.svelte';
  import ScenarioSteps         from '$lib/entities/execution/ui/ScenarioSteps.svelte';
  import ReadonlyNotesBlock    from './ReadonlyNotesBlock.svelte';
  import ReadonlyEvidenceBlock from './ReadonlyEvidenceBlock.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { extractScenarioSteps } from '$lib/shared/gherkin/steps';
  import type { ExecutionPageData } from '$lib/server/executions/queries';

  type RunData    = NonNullable<ExecutionPageData>;
  type Scenario   = RunData['scenarios'][number];
  type Attachment = RunData['attachmentsByScenario'][string][number];

  type Props = {
    scenario:               Scenario;
    attachments:            Attachment[];
    featureContentAtStart:  string;
  };

  let { scenario, attachments, featureContentAtStart }: Props = $props();

  const kind  = $derived(toStatusKind(scenario.status));
  const steps = $derived(extractScenarioSteps(featureContentAtStart, scenario.scenarioName));
</script>

<div class="flex items-center gap-3 mb-3">
  <Status {kind} size={20} />
  <h2 class="text-[15px] font-semibold tracking-tight flex-1 min-w-0 m-0">{scenario.scenarioName}</h2>
  <Pill {kind}>{scenario.status.toLowerCase()}</Pill>
</div>

{#if steps.length > 0}
  <div class="mb-4">
    <ScenarioSteps {steps} scenarioStatus={scenario.status} />
  </div>
{/if}

{#if scenario.errorMessage}
  <div class="px-3 py-2.5 bg-fail-soft border border-fail/30 rounded-md text-[11.5px] text-fail-ink font-mono whitespace-pre-wrap leading-relaxed mb-4">
    <b class="font-semibold">Error</b><br />
    {scenario.errorMessage}
  </div>
{/if}

{#if scenario.logs}
  <details class="mb-4">
    <summary class="text-[11px] uppercase tracking-[0.07em] text-ink-3 cursor-pointer font-medium">Logs</summary>
    <pre class="mt-2 px-3 py-2 bg-surface-2 text-[11.5px] font-mono whitespace-pre-wrap rounded-md text-ink-2 border border-border">{scenario.logs}</pre>
  </details>
{/if}

<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 pt-4 border-t border-dashed border-border max-md:grid-cols-1">
  <ReadonlyNotesBlock    notes={scenario.notes} />
  <ReadonlyEvidenceBlock {attachments} />
</div>
