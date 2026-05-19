<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '$lib/shared/ui/Icon.svelte';

  type Props = {
    title:           string;
    count:           number;
    collapsed:       boolean;
    onToggle:        () => void;
    onFeatureDrop?:  (e: DragEvent) => void;
    header?:         Snippet;
    children?:       Snippet;
  };

  let { title, count, collapsed, onToggle, onFeatureDrop, header, children }: Props = $props();

  let dragHover = $state(false);

  function handleDragOver(e: DragEvent) {
    if (!onFeatureDrop) return;
    if (!e.dataTransfer?.types.includes('application/x-trace-feature')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragHover = true;
  }

  function handleDragLeave() {
    dragHover = false;
  }

  function handleDrop(e: DragEvent) {
    dragHover = false;
    if (!onFeatureDrop) return;
    if (!e.dataTransfer?.types.includes('application/x-trace-feature')) return;
    e.preventDefault();
    onFeatureDrop(e);
  }
</script>

<section
  aria-label={title}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  class="mb-3.5 bg-surface border rounded-xl overflow-hidden transition-colors {dragHover ? 'border-accent bg-accent-soft' : 'border-border'}">
  <div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border">
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
