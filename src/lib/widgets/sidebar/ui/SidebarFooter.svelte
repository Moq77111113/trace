<script lang="ts">
  import { page } from '$app/state';
  import Icon from '$lib/shared/ui/Icon.svelte';
  import { initials } from '../lib/initials';
  import * as m from '$lib/paraglide/messages';

  type User = { id: string; email: string; name: string | null };

  type Props = { user: User };
  let { user }: Props = $props();
</script>

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
