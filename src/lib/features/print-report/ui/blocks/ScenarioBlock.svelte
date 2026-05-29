<script lang="ts">
  import Pill from '$lib/shared/ui/Pill.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import ScenarioSteps from '$lib/entities/execution/ui/ScenarioSteps.svelte';
  import type { StepView } from '$lib/entities/execution/lib/step-view';

  type Attachment = { id: string; filename: string; mimeType: string; sizeBytes: number };
  type Scenario   = { id: string; name: string; status: string; steps: StepView[]; errorMessage: string | null };

  type Props = { scenario: Scenario; attachments: Attachment[] };
  let { scenario, attachments }: Props = $props();

  const kind     = $derived(toStatusKind(scenario.status));
  const isImage  = (mt: string) => mt.startsWith('image/');
  const fmtSize  = (n: number) => `${(n / 1024).toFixed(1)} KB`;
</script>

<article class="border border-border rounded-md p-4 mb-3 break-inside-avoid">
  <header class="flex items-center gap-2 mb-2">
    <Pill {kind}>{scenario.status.toLowerCase()}</Pill>
    <h3 class="text-[14px] font-semibold m-0">{scenario.name}</h3>
  </header>

  <ScenarioSteps steps={scenario.steps} scenarioStatus={scenario.status} />

  {#if scenario.errorMessage}
    <pre class="mt-3 p-3 bg-fail-soft text-fail-ink text-[12px] font-mono whitespace-pre-wrap rounded-md">{scenario.errorMessage}</pre>
  {/if}

  {#if attachments.length > 0}
    <ul class="mt-3 flex flex-col gap-2 list-none p-0 m-0">
      {#each attachments as att (att.id)}
        <li>
          {#if isImage(att.mimeType)}
            <img src="/api/attachments/{att.id}" alt={att.filename} class="max-w-full border border-border rounded-md" />
          {:else}
            <span class="text-[12px] font-mono text-ink-3">{att.filename}, {fmtSize(att.sizeBytes)}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</article>
