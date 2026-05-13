<script lang="ts">
  import { Select as Bits } from 'bits-ui';
  import Icon from './Icon.svelte';

  type Option = { value: string; label: string };
  type Props  = { value: string; onValueChange: (v: string) => void; options: Option[]; placeholder?: string };

  let { value, onValueChange, options, placeholder = 'Select…' }: Props = $props();
</script>

<Bits.Root type="single" bind:value={() => value, onValueChange}>
  <Bits.Trigger class="inline-flex items-center justify-between h-9 px-3 text-sm rounded-md bg-surface-900 border border-surface-600 text-surface-100 min-w-32 gap-2">
    <span>{options.find((o) => o.value === value)?.label ?? placeholder}</span>
    <Icon name="ChevronDown" size={14} />
  </Bits.Trigger>

  <Bits.Portal>
    <Bits.Content class="bg-surface-800 border border-surface-600 rounded-md shadow-lg min-w-32 p-1 z-50">
      {#each options as opt (opt.value)}
        <Bits.Item value={opt.value} class="px-2 py-1.5 text-sm text-surface-100 rounded-sm cursor-pointer hover:bg-surface-700 data-[highlighted]:bg-surface-700">
          {opt.label}
        </Bits.Item>
      {/each}
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
