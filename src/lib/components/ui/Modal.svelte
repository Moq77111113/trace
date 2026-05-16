<script lang="ts">
  import { Dialog as Bits } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    children: Snippet;
    footer?: Snippet;
  };
  let { open, onOpenChange, title, children, footer }: Props = $props();
</script>

<Bits.Root bind:open={() => open, onOpenChange}>
  <Bits.Portal>
    <Bits.Overlay class="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

    <Bits.Content
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
             bg-surface border border-border rounded-xl shadow-[var(--shadow-pop)]
             min-w-[460px] max-w-[90vw] text-ink"
    >
      <div class="px-5 py-3.5 border-b border-border">
        <Bits.Title class="text-[14px] font-semibold tracking-tight">{title}</Bits.Title>
      </div>

      <div class="px-5 py-4 text-[13px]">{@render children()}</div>

      {#if footer}
        <div class="px-5 py-3 border-t border-border bg-canvas rounded-b-xl flex justify-end gap-2">
          {@render footer()}
        </div>
      {/if}
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
