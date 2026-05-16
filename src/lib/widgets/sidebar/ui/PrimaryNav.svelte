<script lang="ts">
  import Icon from '$lib/shared/ui/Icon.svelte';

  type Section = { key: string; label: string; icon: string; href: string };

  type Props = {
    sections: readonly Section[];
    activeKey: string;
  };

  let { sections, activeKey }: Props = $props();
</script>

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
