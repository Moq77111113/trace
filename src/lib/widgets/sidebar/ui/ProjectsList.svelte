<script lang="ts">
  import Icon from '$lib/shared/ui/Icon.svelte';
  import { initials } from '../lib/initials';
  import * as m from '$lib/paraglide/messages';

  type Project = { id: string; name: string };

  type Props = { projects: Project[] };
  let { projects }: Props = $props();
</script>

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
