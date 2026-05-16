<script lang="ts">
  import { page } from '$app/state';
  import Icon     from '$lib/components/ui/Icon.svelte';
  import * as m   from '$lib/paraglide/messages';

  let { data, children } = $props();

  type Item = { href: string; label: string; icon: 'Settings' | 'Server' };

  const items = $derived<Item[]>(
    [
      { href: '/settings/account',  label: m.nav_account(),  icon: 'Settings' as const },
      ...(data.user.role === 'admin'
        ? [{ href: '/settings/instance', label: m.nav_instance(), icon: 'Server' as const }]
        : []),
    ],
  );
</script>

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <div class="grid grid-cols-[200px_1fr] gap-7 max-w-[1100px] max-lg:grid-cols-[180px_1fr] max-lg:gap-6 max-md:grid-cols-[1fr] max-md:gap-4">
    <nav
      aria-label={m.nav_settings()}
      class="flex flex-col gap-px max-md:flex-row max-md:overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-2"
    >
      <div class="px-2.5 pb-2 text-[10.5px] uppercase tracking-[0.07em] text-ink-3 font-medium max-md:hidden">
        {m.nav_settings()}
      </div>
      {#each items as item (item.href)}
        {@const active = page.url.pathname === item.href}
        <a
          href={item.href}
          class="flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:font-medium aria-[current=page]:shadow-[var(--shadow-1)]"
          aria-current={active ? 'page' : undefined}
        >
          <Icon name={item.icon} size={13} class={active ? 'text-ink' : 'text-ink-3'} />
          <span>{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="min-w-0">
      {@render children()}
    </div>
  </div>
</div>
