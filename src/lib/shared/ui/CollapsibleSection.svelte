<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from './Card.svelte';
  import Icon from './Icon.svelte';

  type Props = {
    title:     string;
    subtitle?: string;
    open:      boolean;
    empty:     boolean;
    addLabel:  string;
    onAdd:     () => void;
    children?: Snippet;
  };

  let { title, subtitle, open = $bindable(), empty, addLabel, onAdd, children }: Props = $props();
</script>

<Card>
  <div class="flex flex-col gap-3">
    <header class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="flex items-center gap-2 text-left bg-transparent border-0 cursor-pointer"
        onclick={() => (open = !open)}
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
