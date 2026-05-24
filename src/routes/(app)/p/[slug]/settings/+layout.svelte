<script lang="ts">
  import { page } from '$app/state';
  import Icon from '$lib/shared/ui/Icon.svelte';
  import * as m from '$lib/paraglide/messages';

  let { children } = $props();

  const slug = $derived(page.params.slug);
  const items = $derived([
    { key: 'access', label: m.nav_access(),   icon: 'Users', href: `/p/${slug}/settings/access` },
    { key: 'keys',   label: m.nav_api_keys(), icon: 'Key',   href: `/p/${slug}/settings/api-keys` },
  ] as const);
  const activeKey = $derived(page.url.pathname.endsWith('/api-keys') ? 'keys' : 'access');
</script>

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <div class="grid grid-cols-[220px_1fr] gap-7 max-w-[1100px] max-lg:grid-cols-[200px_1fr] max-lg:gap-6 max-md:grid-cols-[1fr] max-md:gap-4">
    <nav class="flex flex-col gap-px max-md:flex-row max-md:overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-2">
      {#each items as it (it.key)}
        <a
          href={it.href}
          aria-current={activeKey === it.key ? 'page' : undefined}
          class="flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink
                 aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:font-medium aria-[current=page]:shadow-[var(--shadow-1)]"
        >
          <Icon name={it.icon} size={13} /> {it.label}
        </a>
      {/each}
    </nav>

    <section>
      {@render children()}
    </section>
  </div>
</div>
