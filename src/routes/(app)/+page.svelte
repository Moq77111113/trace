<script lang="ts">
  import Pill        from '$lib/components/ui/Pill.svelte';
  import Button      from '$lib/components/ui/Button.svelte';
  import Icon        from '$lib/components/ui/Icon.svelte';
  import EmptyState  from '$lib/components/ui/EmptyState.svelte';
  import PageTitle   from '$lib/components/PageTitle.svelte';
  import WelcomeCard from '$lib/components/WelcomeCard.svelte';
  import { invalidateAll } from '$app/navigation';
  import { toStatusKind } from '$lib/components/ui/Status.svelte';
  import { plural } from '$lib/i18n/plural';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();

  function relative(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (mins < 1)   return m.time_just_now();
    if (mins < 60)  return m.time_minutes_ago({ count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return m.time_hours_ago({ count: hours });
    const days  = Math.floor(hours / 24);
    if (days < 30)  return m.time_days_ago({ count: days });
    return date.toLocaleDateString();
  }

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P';
  }
</script>

<PageTitle title={m.page_title_projects()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  {#if data.welcome}
    <WelcomeCard
      projectId={data.welcome.projectId}
      projectName={data.welcome.projectName}
      featureId={data.welcome.featureId}
      ondismiss={() => invalidateAll()}
    />
  {/if}

  <header class="flex items-end justify-between gap-4 mb-4 max-md:flex-col max-md:items-stretch">
    <div>
      <h1 class="text-[20px] font-semibold tracking-tight">{m.page_title_projects()}</h1>
      <p class="text-[13px] text-ink-3 mt-1">{m.home_subtitle()}</p>
    </div>
    <div>
      <Button href="/projects/new" variant="primary">
        <Icon name="Plus" size={13} /> {m.nav_new_project()}
      </Button>
    </div>
  </header>

  {#if data.projects.length === 0}
    <EmptyState title={m.home_empty_title()}>{m.home_empty_body()}</EmptyState>
  {:else}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
      {#each data.projects as p (p.id)}
        <a
          href="/projects/{p.id}"
          class="flex flex-col gap-3 bg-surface border border-border rounded-xl p-3.5 hover:border-border-strong transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-md bg-surface-2 text-ink-2 text-[12px] font-semibold grid place-items-center border border-border shrink-0">
              {initials(p.name)}
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-[13.5px] font-semibold text-ink truncate">{p.name}</div>
              <div class="text-[11.5px] text-ink-3 mt-0.5 tabular-nums">
                {plural(p.featureCount, m.home_feature_count_one, m.home_feature_count_other)}
              </div>
            </div>
          </div>
          {#if p.lastRunStatus}
            <div class="flex items-center justify-between text-[12px] text-ink-3">
              <span>{m.home_last_run()}</span>
              <Pill kind={toStatusKind(p.lastRunStatus)}>{p.lastRunStatus.toLowerCase()}</Pill>
            </div>
          {/if}
        </a>
      {/each}
    </div>
  {/if}

  {#if data.recentRuns.length > 0}
    <h2 class="text-[16px] font-semibold tracking-tight mt-7 mb-2.5">{m.home_recent_runs()}</h2>
    <div class="bg-surface border border-border rounded-xl overflow-hidden">
      {#each data.recentRuns as r (r.id)}
        <a
          href="/projects/{r.projectId}/runs/{r.id}"
          class="flex items-start gap-2.5 px-3.5 py-2.5 border-t border-border first:border-t-0 hover:bg-surface-2 transition-colors"
        >
          <Pill kind={toStatusKind(r.status)}>{r.status.toLowerCase()}</Pill>
          <div class="flex-1 min-w-0">
            <div class="text-[12.5px] leading-snug">
              <b class="font-semibold">{r.featureName}</b>
            </div>
            <div class="text-[11.5px] text-ink-3 mt-1 flex items-center gap-1.5 tabular-nums">
              <span class="font-mono">{r.source}</span>
              <span class="text-ink-mute">•</span>
              <span>{r.executedBy}</span>
              <span class="text-ink-mute">•</span>
              <span>{relative(r.startedAt)}</span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
