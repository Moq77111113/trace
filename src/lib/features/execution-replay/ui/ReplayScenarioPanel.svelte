<script lang="ts">
  import Pill           from '$lib/shared/ui/Pill.svelte';
  import Status         from '$lib/shared/ui/Status.svelte';
  import Icon           from '$lib/shared/ui/Icon.svelte';
  import ScenarioSteps  from '$lib/entities/execution/ui/ScenarioSteps.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { extractScenarioSteps } from '$lib/shared/gherkin/steps';
  import { isImageMime }          from '$lib/shared/lib/mime';
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

{#if attachments.length > 0}
  <div class="pt-4 border-t border-dashed border-border">
    <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium flex items-center gap-1.5">
      <Icon name="Paperclip" size={11} />
      <span>Attachments</span>
    </div>
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 list-none m-0 p-0">
      {#each attachments as attachment (attachment.id)}
        <li class="border border-border rounded-md overflow-hidden bg-surface">
          <a href="/api/attachments/{attachment.id}" target="_blank" rel="noopener" class="block">
            {#if isImageMime(attachment.mimeType)}
              <img
                src="/api/attachments/{attachment.id}"
                alt={attachment.filename}
                class="block w-full h-20 object-cover border-b border-border"
              />
            {:else}
              <div class="h-20 bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_8px,var(--surface)_8px_16px)] grid place-items-center text-ink-3 font-mono text-[10.5px] border-b border-border">
                {attachment.mimeType.split('/')[0]}
              </div>
            {/if}
            <div class="px-2 py-1.5 text-[11px]">
              <div class="font-medium truncate">{attachment.filename}</div>
              <div class="text-ink-3 mt-0.5 tabular-nums">{(attachment.sizeBytes / 1024).toFixed(1)} KB</div>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </div>
{/if}
