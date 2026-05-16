<script lang="ts">
  import { page }   from '$app/state';
  import { SvelteMap } from 'svelte/reactivity';
  import BrandMark  from './BrandMark.svelte';
  import Icon       from './ui/Icon.svelte';
  import Pill       from './ui/Pill.svelte';
  import Status     from './ui/Status.svelte';
  import { toStatusKind, type StatusKind } from './ui/Status.svelte';
  import { plural } from '$lib/i18n/plural';
  import * as m     from '$lib/paraglide/messages';

  type Project = { id: string; name: string };
  type FeatureRow = {
    id:                    string;
    name:                  string;
    latestFinishedStatus?: string | null;
  };
  type GroupRow = { id: string; name: string };
  type Tree = {
    groups:    { group: GroupRow; features: FeatureRow[] }[];
    ungrouped: FeatureRow[];
  };
  type User = { id: string; email: string; name: string | null };

  type Props = {
    projects: Project[];
    user:     User;
  };

  let { projects, user }: Props = $props();

  const project = $derived(page.data.project as Project | undefined);
  const tree    = $derived(page.data.tree as Tree | undefined);
  const flakeFeatureIds = $derived(page.data.flakeFeatureIds as Set<string> | undefined);

  const expanded = new SvelteMap<string, boolean>();

  function isExpanded(groupId: string): boolean {
    return expanded.get(groupId) ?? true;
  }

  function toggleGroup(groupId: string) {
    expanded.set(groupId, !isExpanded(groupId));
  }

  function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  const sections = $derived(
    project
      ? ([
          { key: 'overview', label: m.nav_overview(), icon: 'Home',     href: `/projects/${project.id}` },
          { key: 'executions', label: m.nav_executions(), icon: 'History',  href: `/projects/${project.id}/executions` },
          { key: 'import',   label: m.nav_import(),   icon: 'Upload',   href: `/projects/${project.id}/import` },
          { key: 'export',   label: m.nav_export(),   icon: 'Download', href: `/projects/${project.id}/export` },
          { key: 'keys',     label: m.nav_api_keys(), icon: 'Key',      href: `/projects/${project.id}/settings/api-keys` }
        ] as const)
      : ([{ key: 'home', label: m.nav_projects(), icon: 'Home', href: '/' }] as const)
  );

  function activeSection(pathname: string): string {
    if (!project) return 'home';
    const base = `/projects/${project.id}`;
    if (pathname.startsWith(`${base}/settings`)) return 'keys';
    if (pathname.startsWith(`${base}/executions`)) return 'executions';
    if (pathname.startsWith(`${base}/import`))   return 'import';
    if (pathname.startsWith(`${base}/export`))   return 'export';
    return 'overview';
  }

  const activeKey     = $derived(activeSection(page.url.pathname));
  const activeFeature = $derived(page.url.pathname.match(/\/features\/([^/]+)/)?.[1] ?? null);

  function featureStatus(f: FeatureRow): StatusKind {
    return f.latestFinishedStatus ? toStatusKind(f.latestFinishedStatus) : 'pending';
  }
</script>

<aside
  class="flex flex-col min-h-0 border-r border-border bg-canvas
         max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-[280px] max-md:z-50
         max-md:-translate-x-full max-md:transition-transform max-md:duration-200
         max-md:[.app[data-sidebar=open]_&]:translate-x-0
         max-md:shadow-[var(--shadow-pop)]"
>
  <a href="/" class="flex items-center gap-2 px-3.5 py-3.5 border-b border-border">
    <span class="w-[22px] h-[22px] rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
      <BrandMark size={18} />
    </span>
    <span class="font-semibold tracking-[-0.01em] text-[14px]">Trace</span>
  </a>

  {#if project}
    <div class="m-2.5 mb-1.5 p-2.5 border border-border rounded-lg bg-surface flex items-center gap-2.5">
      <span class="w-[22px] h-[22px] rounded-md bg-surface-2 text-ink-2 text-[11px] font-semibold tracking-wider grid place-items-center shrink-0 border border-border">
        {initials(project.name).slice(0, 2) || 'P'}
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-semibold leading-tight truncate">{project.name}</div>
        <div class="text-[11px] text-ink-3 mt-0.5 tabular-nums">{plural(projects.length, m.home_project_count_one, m.home_project_count_other)}</div>
      </div>
    </div>
  {/if}

  <nav class="px-2 py-1 flex flex-col gap-px" aria-label="Primary">
    {#each sections as s (s.key)}
      {@const isActive = activeKey === s.key}
      <a
        href={s.href}
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-ink-2
               hover:bg-surface-2 hover:text-ink
               aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:font-medium aria-[current=page]:shadow-[var(--shadow-1)]"
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon name={s.icon as never} size={14} class={isActive ? 'text-ink' : 'text-ink-3'} />
        <span>{s.label}</span>
      </a>
    {/each}
  </nav>

  {#if !project && projects.length > 0}
    <div class="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-ink-3 flex items-center justify-between">
      <span>{m.nav_projects()}</span>
      <a
        href="/projects/new"
        aria-label={m.nav_new_project()}
        class="w-4 h-4 grid place-items-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <Icon name="Plus" size={12} />
      </a>
    </div>

    <div class="px-2 flex flex-col gap-px overflow-y-auto">
      {#each projects as p (p.id)}
        <a
          href="/projects/{p.id}"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <span class="w-[18px] h-[18px] rounded-sm bg-surface-2 border border-border text-ink-2 text-[9.5px] font-semibold grid place-items-center shrink-0">
            {initials(p.name).slice(0, 2) || 'P'}
          </span>
          <span class="flex-1 min-w-0 truncate">{p.name}</span>
        </a>
      {/each}
    </div>
  {/if}

  {#if project && tree && (tree.groups.length > 0 || tree.ungrouped.length > 0)}
    <div class="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-ink-3 flex items-center justify-between">
      <span>{m.nav_features()}</span>
      <a
        href="/projects/{project.id}/features/new"
        aria-label={m.nav_new_feature()}
        class="w-4 h-4 grid place-items-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <Icon name="Plus" size={12} />
      </a>
    </div>

    <div class="px-2 flex flex-col gap-px overflow-y-auto">
      {#each tree.groups as g (g.group.id)}
        {@const open = isExpanded(g.group.id)}
        <button
          type="button"
          class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-ink-2 text-[12.5px] hover:bg-surface-2 hover:text-ink w-full text-left bg-transparent border-0 cursor-pointer"
          onclick={() => toggleGroup(g.group.id)}
        >
          <Icon
            name="ChevronRight"
            size={12}
            class="text-ink-3 transition-transform {open ? 'rotate-90' : ''}"
          />
          <span class="flex-1 font-medium">{g.group.name}</span>
          <span class="text-[10.5px] text-ink-3 tabular-nums">{g.features.length}</span>
        </button>

        {#if open}
          {#each g.features as f (f.id)}
            {@const active = activeFeature === f.id}
            <a
              href="/projects/{project.id}/features/{f.id}"
              class="flex items-center gap-2 pl-6 pr-2 py-1 rounded-md text-[12.5px] text-ink-2 leading-snug hover:bg-surface-2 hover:text-ink
                     aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[var(--shadow-1)]"
              aria-current={active ? 'page' : undefined}
            >
              <Status kind={featureStatus(f)} size={10} />
              <span class="flex-1 min-w-0 truncate">{f.name}</span>
              {#if flakeFeatureIds?.has(f.id)}
                <Pill kind="flake" glyph={false}>flake</Pill>
              {/if}
            </a>
          {/each}
        {/if}
      {/each}

      {#each tree.ungrouped as f (f.id)}
        {@const active = activeFeature === f.id}
        <a
          href="/projects/{project.id}/features/{f.id}"
          class="flex items-center gap-2 pl-3.5 pr-2 py-1 rounded-md text-[12.5px] text-ink-2 leading-snug hover:bg-surface-2 hover:text-ink
                 aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[var(--shadow-1)]"
          aria-current={active ? 'page' : undefined}
        >
          <Status kind={featureStatus(f)} size={10} />
          <span class="flex-1 min-w-0 truncate">{f.name}</span>
          {#if flakeFeatureIds?.has(f.id)}
            <Pill kind="flake" glyph={false}>flake</Pill>
          {/if}
        </a>
      {/each}
    </div>
  {/if}

  <div class="mt-auto border-t border-border">
    <div class="px-2.5 pt-2 pb-1.5 flex items-center gap-1 text-ink-3">
      <a
        href="https://github.com/Moq77111113/trace"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={m.nav_github_repo()}
        title={m.nav_github_repo()}
        class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] hover:bg-surface-2 hover:text-ink"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
        </svg>
        <span>{m.nav_github()}</span>
      </a>
      <a
        href="https://github.com/Moq77111113/trace/issues/new"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={m.nav_report_issue()}
        title={m.nav_report_issue()}
        class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] hover:bg-surface-2 hover:text-ink"
      >
        <Icon name="LifeBuoy" size={13} />
        <span>{m.nav_report_issue()}</span>
      </a>
    </div>

    <div class="p-2.5 pt-1.5 flex items-center gap-2">
      <div class="flex items-center gap-2 px-1.5 py-1 rounded-md flex-1 min-w-0 hover:bg-surface-2">
        <span class="w-[22px] h-[22px] rounded-full bg-surface-2 border border-border grid place-items-center text-ink-2 text-[10.5px] font-semibold shrink-0">
          {initials(user.name ?? user.email) || user.email.slice(0, 1).toUpperCase()}
        </span>
        <div class="min-w-0 flex-1">
          <div class="text-[12.5px] font-medium leading-tight truncate">{user.name ?? user.email.split('@')[0]}</div>
          <div class="text-[11px] text-ink-3 truncate">{user.email}</div>
        </div>
      </div>
      <a
        href="/settings/account"
        aria-label={m.nav_settings()}
        title={m.nav_settings()}
        class="w-[26px] h-[26px] grid place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-ink"
        aria-current={page.url.pathname.startsWith('/settings') ? 'page' : undefined}
      >
        <Icon name="Settings" size={14} />
      </a>
    </div>
  </div>
</aside>
