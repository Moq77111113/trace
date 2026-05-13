<script lang="ts">
  import { Checkbox as Bits } from 'bits-ui';
  import Icon from './Icon.svelte';

  type Props = { checked: boolean; onCheckedChange: (v: boolean) => void; label?: string };
  let { checked, onCheckedChange, label }: Props = $props();
</script>

<label class="inline-flex items-center gap-2 cursor-pointer text-sm text-surface-100">
  <Bits.Root
    bind:checked={() => checked, onCheckedChange}
    class="h-4 w-4 rounded-sm border border-surface-500 bg-surface-900 flex items-center justify-center data-[state=checked]:bg-accent-500 data-[state=checked]:border-accent-500"
  >
    {#snippet children({ checked })}
      {#if checked}<Icon name="Check" size={12} class="text-white" />{/if}
    {/snippet}
  </Bits.Root>

  {#if label}<span>{label}</span>{/if}
</label>
