<script lang="ts">
  import { untrack } from 'svelte';
  import Badge          from '$lib/components/ui/Badge.svelte';
  import Button         from '$lib/components/ui/Button.svelte';
  import RunLauncher    from '$lib/components/RunLauncher.svelte';
  import SnapshotModal  from '$lib/components/SnapshotModal.svelte';
  import {
    formatRunDuration,
    formatScenarioDuration,
    isImageMime,
    statusBadgeVariant,
    statusIcon,
  } from '$lib/runs/format';
  import type { RunPageData } from '$lib/server/runs/queries';

  type Props = { data: NonNullable<RunPageData> };
  let { data }: Props = $props();

  type Scenario   = Props['data']['scenarios'][number];
  type Attachment = Props['data']['attachmentsByScenario'][string][number];

  let selectedId   = $state(untrack(() => data.scenarios[0]?.id ?? ''));
  let showSnapshot = $state(false);

  const selected            = $derived<Scenario | undefined>(data.scenarios.find((s) => s.id === selectedId));
  const selectedAttachments = $derived<Attachment[]>(selected ? data.attachmentsByScenario[selected.id] ?? [] : []);
</script>

<header class="flex items-center justify-between mb-4">
  <div class="flex items-center gap-3">
    <h2 class="text-lg font-semibold">{data.feature.name}</h2>
    <Badge variant={statusBadgeVariant(data.run.status)}>{data.run.status}</Badge>
  </div>

  <div class="flex items-center gap-2">
    <Button variant="secondary" onclick={() => (showSnapshot = true)}>View snapshot</Button>
    <RunLauncher projectId={data.project.id} featureId={data.feature.id} />
  </div>
</header>

<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs text-surface-400 mb-4 max-w-2xl">
  <dt>Source</dt>      <dd class="text-surface-200">{data.run.source}</dd>
  <dt>Executor</dt>    <dd class="text-surface-200">{data.run.executedBy}</dd>
  <dt>Environment</dt> <dd class="text-surface-200">{data.run.environment ?? '—'}</dd>
  <dt>Started</dt>     <dd class="text-surface-200">{new Date(data.run.startedAt).toLocaleString()}</dd>
  <dt>Duration</dt>    <dd class="text-surface-200">{formatRunDuration(data.run.startedAt, data.run.finishedAt)}</dd>
  {#if data.run.notes}
    <dt>Notes</dt>
    <dd class="text-surface-200 whitespace-pre-wrap">{data.run.notes}</dd>
  {/if}
</dl>

<section class="grid grid-cols-[40%_1fr] min-h-[440px] border border-surface-700 rounded-md overflow-hidden bg-surface-900">
  <aside class="border-r border-surface-700">
    <header class="px-4 py-3 text-xs uppercase text-surface-400 tracking-wide border-b border-surface-700">
      Scenarios · {data.scenarios.length}
    </header>

    <ul>
      {#each data.scenarios as scenario (scenario.id)}
        <li>
          <button
            type="button"
            class="w-full flex justify-between items-center px-4 py-2 text-sm border-b border-surface-700 text-left hover:bg-surface-800 transition"
            class:bg-surface-800={scenario.id === selectedId}
            onclick={() => (selectedId = scenario.id)}
          >
            <span class="flex items-center gap-2">
              <span class="text-surface-400">{statusIcon(scenario.status)}</span>
              <span>{scenario.scenarioName}</span>
            </span>
            <span class="text-xs text-surface-400">{formatScenarioDuration(scenario.durationMs)}</span>
          </button>
        </li>
      {/each}
    </ul>
  </aside>

  <article class="p-6">
    {#if selected}
      <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Scenario</div>
      <h3 class="text-base font-semibold mb-3">{selected.scenarioName}</h3>

      <div class="mb-4"><Badge variant={statusBadgeVariant(selected.status)}>{selected.status}</Badge></div>

      {#if selected.errorMessage}
        <div class="mb-4">
          <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Error</div>
          <pre class="px-3 py-2 bg-surface-800 border border-state-failed/40 text-state-failed text-xs font-mono whitespace-pre-wrap rounded">{selected.errorMessage}</pre>
        </div>
      {/if}

      {#if selected.logs}
        <details class="mb-4">
          <summary class="text-xs uppercase tracking-wide text-surface-400 cursor-pointer">Logs</summary>
          <pre class="mt-2 px-3 py-2 bg-surface-800 text-xs font-mono whitespace-pre-wrap rounded text-surface-200">{selected.logs}</pre>
        </details>
      {/if}

      {#if selectedAttachments.length > 0}
        <div>
          <div class="text-xs uppercase tracking-wide text-surface-400 mb-2">Attachments</div>
          <ul class="space-y-2">
            {#each selectedAttachments as attachment (attachment.id)}
              <li>
                {#if isImageMime(attachment.mimeType)}
                  <a href="/api/attachments/{attachment.id}" target="_blank" rel="noopener" class="block">
                    <img src="/api/attachments/{attachment.id}" alt={attachment.filename} class="max-w-md rounded border border-surface-700" />
                    <span class="block mt-1 text-xs text-surface-400">{attachment.filename} · {(attachment.sizeBytes / 1024).toFixed(1)} KB</span>
                  </a>
                {:else}
                  <a href="/api/attachments/{attachment.id}" target="_blank" rel="noopener" class="text-accent-400 hover:underline text-sm">
                    📎 {attachment.filename}
                  </a>
                  <span class="text-xs text-surface-400">· {(attachment.sizeBytes / 1024).toFixed(1)} KB</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}
  </article>
</section>

<SnapshotModal
  open={showSnapshot}
  onOpenChange={(v) => (showSnapshot = v)}
  content={data.run.featureContentAtRun}
/>
