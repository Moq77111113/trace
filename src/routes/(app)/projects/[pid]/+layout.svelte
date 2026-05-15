<script lang="ts">
  import { page } from '$app/state';

  let { data, children } = $props();

  type TabKey = 'features' | 'runs' | 'import' | 'export' | 'settings';

  const tabs: { key: TabKey; label: string; slug: string }[] = [
    { key: 'features', label: 'Features', slug: '' },
    { key: 'runs',     label: 'Runs',     slug: 'runs' },
    { key: 'import',   label: 'Import',   slug: 'import' },
    { key: 'export',   label: 'Export',   slug: 'export' },
    { key: 'settings', label: 'Settings', slug: 'settings/api-keys' },
  ];

  function activeTab(pathname: string): TabKey {
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/runs'))     return 'runs';
    if (pathname.includes('/import'))   return 'import';
    if (pathname.includes('/export'))   return 'export';
    return 'features';
  }

  const active = $derived(activeTab(page.url.pathname));

  function hrefFor(slug: string): string {
    const base = `/projects/${data.project.id}`;
    return slug === '' ? base : `${base}/${slug}`;
  }

  function tabClass(isActive: boolean): string {
    const base = 'px-4 py-2.5 text-sm border-b-2 transition';
    if (isActive) return `${base} text-surface-100 border-accent-500`;
    return `${base} text-surface-400 border-transparent hover:text-surface-200`;
  }
</script>

<h1 class="text-xl font-semibold mb-1">{data.project.name}</h1>
{#if data.project.description}<p class="text-sm text-surface-400 mb-4">{data.project.description}</p>{/if}

<nav class="flex gap-0 border-b border-surface-700" aria-label="Project sections">
  {#each tabs as tab (tab.key)}
    <a href={hrefFor(tab.slug)} class={tabClass(active === tab.key)}>{tab.label}</a>
  {/each}
</nav>

<div class="mt-6">{@render children()}</div>
