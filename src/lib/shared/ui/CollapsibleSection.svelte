<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from './Card.svelte';
  import Icon from './Icon.svelte';

  type Props = {
    title: string;
    subtitle?: string;
    open: boolean;
    empty: boolean;
    addLabel: string;
    storageKey: string;
    onOpenChange: (open: boolean) => void;
    onAdd: () => void;
    children?: Snippet;
  };

  let { title, subtitle, open, empty, addLabel, storageKey, onOpenChange, onAdd, children }: Props = $props();

  $effect(() => {
    if (typeof localStorage === 'undefined') return;
    const v = localStorage.getItem(storageKey);
    if (v === null) return;
    onOpenChange(v === '1');
  });

  function toggle() {
    const next = !open;
    onOpenChange(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, next ? '1' : '0');
  }
</script>

<Card>
  <div class="flex flex-col gap-3">
    <header class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="flex items-center gap-2 text-left bg-transparent border-0 cursor-pointer"
        onclick={toggle}
        aria-expanded={open}
      >
        <Icon
          name="ChevronRight"
          size={12}
          class="text-ink-3 transition-transform {open ? 'rotate-90' : ''}"
        />
        <span class="text-[13px] font-medium text-ink">{title}</span>
        {#if subtitle}
          <span class="text-[12px] text-ink-3">{subtitle}</span>
        {/if}
      </button>
      {#if empty}
        <button
          type="button"
          class="text-[12px] text-ink-2 hover:text-ink"
          onclick={onAdd}
        >{addLabel}</button>
      {/if}
    </header>
    {#if open && !empty}
      {@render children?.()}
    {/if}
  </div>
</Card>
