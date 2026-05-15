<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  type Props = {
    title:      string;
    count:      number;
    draggable:  boolean;
    collapsed:  boolean;
    onToggle:   () => void;
    header?:    Snippet;
    children?:  Snippet;
  };
  let { title, count, draggable, collapsed, onToggle, header, children }: Props = $props();
</script>

<section class="border border-surface-700 rounded-md mb-3 bg-surface-800">
  <div class="flex items-center gap-2 px-3 py-2 border-b border-surface-700">
    {#if draggable}
      <span data-testid="drag-handle" class="cursor-grab text-surface-400 select-none">
        <Icon name="GripVertical" />
      </span>
    {/if}
    <button
      type="button"
      data-testid="group-toggle"
      class="flex items-center gap-2 text-left flex-1 hover:text-accent-300"
      onclick={onToggle}
    >
      <Icon name={collapsed ? 'ChevronRight' : 'ChevronDown'} />
      <span class="font-medium">{title}</span>
      <span class="text-xs text-surface-400">({count})</span>
    </button>
    {#if header}
      <div class="flex items-center gap-1">{@render header()}</div>
    {/if}
  </div>
  {#if !collapsed && children}
    <div class="px-1 py-1">{@render children()}</div>
  {/if}
</section>
