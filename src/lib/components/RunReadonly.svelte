<script lang="ts">
  import { untrack } from 'svelte';
  import Pill           from '$lib/components/ui/Pill.svelte';
  import Button         from '$lib/components/ui/Button.svelte';
  import Status         from '$lib/components/ui/Status.svelte';
  import Icon           from '$lib/components/ui/Icon.svelte';
  import RunLauncher    from '$lib/components/RunLauncher.svelte';
  import SnapshotModal  from '$lib/components/SnapshotModal.svelte';
  import { toStatusKind } from '$lib/components/ui/Status.svelte';
  import {
    formatRunDuration,
    formatScenarioDuration,
    isImageMime
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
  const runKind             = $derived(toStatusKind(data.run.status));
</script>

<section class="grid grid-rows-[auto_1fr] min-h-0 flex-1">
  <header class="flex flex-col gap-2.5 px-5 py-3.5 border-b border-border bg-bg max-md:px-3.5">
    <div class="flex items-center gap-3.5 flex-wrap">
      <div class="flex items-center gap-2.5">
        <Status kind={runKind} size={16} />
        <h1 class="text-[16px] font-semibold tracking-tight m-0">{data.feature.name}</h1>
        <Pill kind={runKind}>{data.run.status.toLowerCase()}</Pill>
      </div>

      <div class="flex items-center gap-3 text-[12px] text-ink-3 tabular-nums flex-wrap">
        <span class="font-mono text-ink-2">#{data.run.id.slice(0, 8)}</span>
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
        <span class="font-mono">{data.run.source}</span>
        {#if data.run.environment}
          <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
          <span class="text-ink-2 font-medium">{data.run.environment}</span>
        {/if}
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
        <span>{new Date(data.run.startedAt).toLocaleString()}</span>
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
        <span>{formatRunDuration(data.run.startedAt, data.run.finishedAt)}</span>
        <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
        <span>{data.run.executedBy}</span>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <Button variant="secondary" onclick={() => (showSnapshot = true)}>
          <Icon name="Eye" size={13} /> Snapshot
        </Button>
        <RunLauncher projectId={data.project.id} featureId={data.feature.id} />
      </div>
    </div>

    {#if data.run.notes}
      <div class="text-[12.5px] text-ink-2 leading-relaxed border border-border rounded-md px-3 py-2 bg-surface whitespace-pre-wrap max-w-3xl">
        <span class="text-[10.5px] uppercase tracking-[0.07em] text-ink-3 font-medium block mb-1">Notes</span>
        {data.run.notes}
      </div>
    {/if}
  </header>

  <div class="grid grid-cols-[360px_1fr] min-h-0 max-lg:grid-cols-[280px_1fr] max-md:grid-cols-[1fr] max-md:grid-rows-[auto_1fr]">
    <aside class="border-r border-border flex flex-col min-h-0 bg-bg max-md:border-r-0 max-md:border-b max-md:max-h-[38vh]">
      <header class="px-3.5 py-2.5 border-b border-border flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        <span>Scenarios</span>
        <span class="ml-auto text-ink-2 text-[11px] normal-case tabular-nums tracking-normal">{data.scenarios.length}</span>
      </header>

      <ul class="flex-1 overflow-auto py-1 m-0 p-0 list-none">
        {#each data.scenarios as scenario (scenario.id)}
          {@const active = scenario.id === selectedId}
          {@const kind = toStatusKind(scenario.status)}
          <li>
            <button
              type="button"
              class="grid grid-cols-[16px_1fr_auto] gap-2.5 px-3.5 py-2 w-full text-left bg-transparent border-0 cursor-pointer items-start border-l-2 border-transparent hover:bg-surface-2 {active ? 'bg-surface !border-l-accent' : ''}"
              onclick={() => (selectedId = scenario.id)}
            >
              <Status kind={kind} size={14} class="mt-0.5" />
              <div class="min-w-0">
                <div class="text-[13px] font-medium leading-tight {kind === 'skip' || kind === 'pending' ? 'text-ink-3 font-normal' : ''}">
                  {scenario.scenarioName}
                </div>
              </div>
              <span class="text-[11px] text-ink-3 tabular-nums mt-0.5">
                {formatScenarioDuration(scenario.durationMs)}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <article class="overflow-auto min-h-0 px-5 py-4 max-md:px-3.5">
      {#if selected}
        {@const kind = toStatusKind(selected.status)}

        <div class="flex items-center gap-3 mb-3">
          <Status kind={kind} size={20} />
          <h2 class="text-[15px] font-semibold tracking-tight flex-1 min-w-0 m-0">{selected.scenarioName}</h2>
          <Pill kind={kind}>{selected.status.toLowerCase()}</Pill>
        </div>

        {#if selected.errorMessage}
          <div class="px-3 py-2.5 bg-fail-soft border border-fail/30 rounded-md text-[11.5px] text-fail-ink font-mono whitespace-pre-wrap leading-relaxed mb-4">
            <b class="font-semibold">Error</b><br />
            {selected.errorMessage}
          </div>
        {/if}

        {#if selected.logs}
          <details class="mb-4">
            <summary class="text-[11px] uppercase tracking-[0.07em] text-ink-3 cursor-pointer font-medium">Logs</summary>
            <pre class="mt-2 px-3 py-2 bg-surface-2 text-[11.5px] font-mono whitespace-pre-wrap rounded-md text-ink-2 border border-border">{selected.logs}</pre>
          </details>
        {/if}

        {#if selectedAttachments.length > 0}
          <div class="pt-4 border-t border-dashed border-border">
            <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium flex items-center gap-1.5">
              <Icon name="Paperclip" size={11} />
              <span>Attachments</span>
            </div>
            <ul class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 list-none m-0 p-0">
              {#each selectedAttachments as attachment (attachment.id)}
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
      {/if}
    </article>
  </div>
</section>

<SnapshotModal
  open={showSnapshot}
  onOpenChange={(v) => (showSnapshot = v)}
  content={data.run.featureContentAtRun}
/>
