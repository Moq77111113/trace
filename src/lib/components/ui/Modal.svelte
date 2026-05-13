<script lang="ts">
  import { Dialog as Bits } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = { open: boolean; onOpenChange: (v: boolean) => void; title: string; children: Snippet; footer?: Snippet };
  let { open, onOpenChange, title, children, footer }: Props = $props();
</script>

<Bits.Root bind:open={() => open, onOpenChange}>
  <Bits.Portal>
    <Bits.Overlay class="fixed inset-0 bg-black/60 z-40" />

    <Bits.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                          bg-surface-800 border border-surface-600 rounded-lg shadow-xl
                          min-w-[460px] max-w-[90vw] text-surface-100">
      <div class="px-5 py-4 border-b border-surface-700">
        <Bits.Title class="text-base font-semibold">{title}</Bits.Title>
      </div>

      <div class="px-5 py-4">{@render children()}</div>

      {#if footer}
        <div class="px-5 py-3 border-t border-surface-700 bg-surface-900 rounded-b-lg flex justify-end gap-2">
          {@render footer()}
        </div>
      {/if}
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
