<script lang="ts">
  import { untrack }     from 'svelte';
  import { page }        from '$app/state';
  import Icon            from './ui/Icon.svelte';
  import CommandPalette  from './CommandPalette.svelte';
  import { applyTheme }  from '$lib/theme.client';
  import { isTypingTarget } from '$lib/runs/format';
  import type { Theme }  from '$lib/theme';
  import * as m          from '$lib/paraglide/messages';

  type Crumb = { label: string; href?: string };
  type Props = {
    theme: Theme;
    onToggleSidebar?: () => void;
  };

  let { theme: initialTheme, onToggleSidebar }: Props = $props();

  let currentTheme = $state<Theme>(untrack(() => initialTheme));

  let paletteOpen = $state(false);

  function flipTheme() {
    const next: Theme = currentTheme === 'light' ? 'dark' : 'light';
    currentTheme = next;
    applyTheme(next);
  }

  $effect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        paletteOpen = true;
        return;
      }
      if (e.key === '/' && !isTypingTarget(e.target) && !paletteOpen) {
        e.preventDefault();
        paletteOpen = true;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const crumbs = $derived(buildCrumbs(page.url.pathname));

  function buildCrumbs(pathname: string): Crumb[] {
    const project = page.data.project as { id: string; name: string } | undefined;
    const feature = page.data.feature as { id: string; name: string } | undefined;
    const out: Crumb[] = [];

    if (!project) {
      if (pathname === '/') out.push({ label: m.nav_projects() });
      else if (pathname.startsWith('/projects/new')) {
        out.push({ label: m.nav_projects(), href: '/' });
        out.push({ label: m.breadcrumb_new_project() });
      } else if (pathname.startsWith('/account')) {
        out.push({ label: m.nav_account() });
      } else if (pathname.startsWith('/settings/instance')) {
        out.push({ label: m.nav_settings(), href: '/' });
        out.push({ label: m.nav_instance() });
      } else {
        out.push({ label: m.nav_home(), href: '/' });
      }
      return out;
    }

    const base = `/projects/${project.id}`;
    out.push({ label: project.name, href: base });

    if (pathname === base) {
      out.push({ label: m.nav_overview() });
    } else if (pathname.startsWith(`${base}/features/new`)) {
      out.push({ label: m.nav_features(), href: base });
      out.push({ label: m.breadcrumb_new_feature() });
    } else if (pathname.startsWith(`${base}/features/`) && feature) {
      out.push({ label: m.nav_features(), href: base });
      out.push({ label: feature.name });
    } else if (pathname.match(new RegExp(`^${base}/runs/[^/]+`))) {
      const rid = pathname.split('/').pop() ?? '';
      out.push({ label: m.nav_runs(), href: `${base}/runs` });
      out.push({ label: rid.slice(0, 8) });
    } else if (pathname.startsWith(`${base}/runs`)) {
      out.push({ label: m.nav_runs() });
    } else if (pathname.startsWith(`${base}/import`)) {
      out.push({ label: m.nav_import() });
    } else if (pathname.startsWith(`${base}/export`)) {
      out.push({ label: m.nav_export() });
    } else if (pathname.startsWith(`${base}/settings/api-keys`)) {
      out.push({ label: m.nav_settings() });
      out.push({ label: m.nav_api_keys() });
    }

    return out;
  }
</script>

<header
  class="h-12 flex items-center gap-2.5 px-4 border-b border-border bg-bg max-md:h-11 max-md:px-3 max-md:gap-1.5"
>
  {#if onToggleSidebar}
    <button
      type="button"
      class="hidden max-md:inline-grid w-[30px] h-[30px] place-items-center border border-transparent bg-transparent rounded-md text-ink-2 cursor-pointer hover:bg-surface hover:text-ink hover:border-border shrink-0"
      onclick={onToggleSidebar}
      aria-label={m.nav_toggle_sidebar()}
    >
      <Icon name="Menu" size={16} />
    </button>
  {/if}

  <nav class="flex items-center gap-1.5 text-[13px] text-ink-2 min-w-0" aria-label="Breadcrumb">
    {#each crumbs as c, i (i)}
      {#if i > 0}<span class="text-ink-mute">›</span>{/if}
      {#if c.href && i < crumbs.length - 1}
        <a class="hover:text-ink truncate" href={c.href}>{c.label}</a>
      {:else}
        <span class="text-ink font-medium truncate">{c.label}</span>
      {/if}
    {/each}
  </nav>

  <div class="flex-1"></div>

  <button
    type="button"
    class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-md bg-surface w-60 text-[12.5px] text-ink-3 cursor-pointer hover:border-border-strong hover:text-ink-2"
    onclick={() => (paletteOpen = true)}
    aria-label={m.nav_open_search()}
  >
    <Icon name="Search" size={13} />
    <span>{m.nav_search_features()}</span>
    <kbd class="ml-auto text-[10.5px] font-medium px-1.5 py-px border border-border rounded-sm text-ink-3 bg-canvas">⌘K</kbd>
  </button>

  <button
    type="button"
    class="md:hidden w-[30px] h-[30px] grid place-items-center border border-transparent bg-transparent rounded-md text-ink-2 cursor-pointer hover:bg-surface hover:text-ink hover:border-border"
    onclick={() => (paletteOpen = true)}
    aria-label={m.nav_open_search()}
  >
    <Icon name="Search" size={15} />
  </button>

  <button
    type="button"
    class="w-[30px] h-[30px] grid place-items-center border border-transparent bg-transparent rounded-md text-ink-2 cursor-pointer hover:bg-surface hover:text-ink hover:border-border"
    onclick={flipTheme}
    aria-label={m.nav_toggle_theme()}
    title={currentTheme === 'light' ? m.nav_theme_switch_to_dark() : m.nav_theme_switch_to_light()}
  >
    <Icon name={currentTheme === 'light' ? 'Moon' : 'Sun'} size={15} />
  </button>
</header>

<CommandPalette open={paletteOpen} onOpenChange={(v) => (paletteOpen = v)} />
