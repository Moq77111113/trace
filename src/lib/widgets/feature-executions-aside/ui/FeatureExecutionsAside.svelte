<script lang="ts">
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';
  import Status from '$lib/shared/ui/Status.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { formatExecutionDuration } from '$lib/entities/execution/lib/format';
  import { relativeTime }      from '$lib/shared/i18n/relative-time';
  import * as m from '$lib/paraglide/messages';

  type RecentRun = {
    id:          string;
    status:      string;
    source:      string;
    environment: string | null;
    startedAt:   Date | string;
    finishedAt:  Date | string | null;
  };

  type Props = {
    projectSlug: string;
    recentRuns:  RecentRun[];
  };

  let { projectSlug, recentRuns }: Props = $props();

  const latest = $derived(recentRuns[0]);
  const latestIsRunning = $derived(latest?.status === 'IN_PROGRESS');
</script>

<aside class="flex flex-col gap-5 px-4 py-4 border-l border-border bg-bg overflow-y-auto min-h-0">
  {#if !latest}
    <section>
      <h3 class="text-[10.5px] uppercase tracking-[0.07em] text-ink-3 font-medium mb-2">{m.home_last_execution()}</h3>
      <p class="text-[12.5px] text-ink-2 font-medium">{m.feature_aside_no_executions_yet()}</p>
      <p class="text-[11.5px] text-ink-3 mt-1">{m.feature_aside_no_executions_hint()}</p>
    </section>
  {:else}
    {@const latestKind = toStatusKind(latest.status)}
    <section>
      <h3 class="text-[10.5px] uppercase tracking-[0.07em] text-ink-3 font-medium mb-2">{m.home_last_execution()}</h3>
      <div class="flex items-center gap-2 mb-2">
        <Pill kind={latestKind}>{latest.status.toLowerCase()}</Pill>
        <span class="text-[11.5px] text-ink-3 tabular-nums">
          {relativeTime(latest.startedAt)}
          <span class="text-ink-mute mx-1">·</span>
          <span class="font-mono">{latest.source.toLowerCase()}</span>
        </span>
      </div>
      <a
        href="/p/{projectSlug}/executions/{latest.id}"
        class="flex items-center justify-center gap-1.5 px-3 h-[28px] text-[12px] font-medium rounded-md border border-border text-ink-2 hover:bg-surface-2 hover:text-ink hover:border-border-strong w-full"
      >
        <Icon name={latestIsRunning ? 'Play' : 'Eye'} size={12} />
        <span>{latestIsRunning ? m.feature_aside_open_live_execution() : m.feature_aside_view_execution()}</span>
        <Icon name="ArrowRight" size={11} class="text-ink-3" />
      </a>
    </section>

    <section>
      <h3 class="text-[10.5px] uppercase tracking-[0.07em] text-ink-3 font-medium mb-2">{m.home_recent_executions()}</h3>
      <ul class="m-0 p-0 list-none flex flex-col">
        {#each recentRuns as r (r.id)}
          {@const kind = toStatusKind(r.status)}
          <li>
            <a
              href="/p/{projectSlug}/executions/{r.id}"
              class="grid grid-cols-[14px_auto_1fr_auto] items-center gap-2 py-1 text-[12px] hover:bg-surface-2 rounded-md px-1.5 -mx-1.5"
            >
              <Status kind={kind} size={11} />
              <span class="font-mono text-[11px] text-ink-3 tabular-nums">{r.id.slice(0, 6)}</span>
              <span class="text-[11.5px] text-ink-3 truncate">{relativeTime(r.startedAt)}</span>
              <span class="text-[11.5px] text-ink-2 tabular-nums font-mono">{formatExecutionDuration(r.startedAt, r.finishedAt)}</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</aside>
