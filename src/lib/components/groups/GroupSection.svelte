<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  type Props = {
    title:     string;
    count:     number;
    draggable: boolean;
    collapsed: boolean;
    onToggle:  () => void;
    header?:   Snippet;
    children?: Snippet;
  };

  let { title, count, draggable, collapsed, onToggle, header, children }: Props = $props();
</script>

<section class="mb-3.5 bg-surface border border-border rounded-xl overflow-hidden">
  <div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border">
    {#if draggable}
      <span
        data-testid="drag-handle"
        class="text-ink-3 cursor-grab inline-flex items-center select-none active:cursor-grabbing"
        aria-hidden="true"
      >
        <Icon name="GripVertical" size={14} />
      </span>
    {/if}

    <button
      type="button"
      data-testid="group-toggle"
      class="inline-flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-inherit font-inherit"
      onclick={onToggle}
    >
      <Icon
        name="ChevronRight"
        size={14}
        class="text-ink-3 transition-transform {collapsed ? '' : 'rotate-90'}"
      />
      <span class="font-semibold text-[13.5px] tracking-tight">{title}</span>
      <span class="text-[11.5px] text-ink-3 tabular-nums ml-1">
        {count} feature{count === 1 ? '' : 's'}
      </span>
    </button>

    <div class="flex-1"></div>

    {#if header}
      <div class="inline-flex items-center gap-1">{@render header()}</div>
    {/if}
  </div>

  {#if !collapsed && children}
    <div>{@render children()}</div>
  {/if}
</section>
