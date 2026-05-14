<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'value'> & {
    invalid?: boolean;
    value?:   string;
  };

  let {
    invalid = false,
    value   = $bindable(''),
    class: cls = '',
    ...rest
  }: Props = $props();

  const base   = 'h-9 px-3 text-sm rounded-md bg-surface-900 border text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2';
  const border = $derived(
    invalid
      ? 'border-state-failed focus:ring-state-failed/40'
      : 'border-surface-600 focus:border-accent-500 focus:ring-accent-500/30',
  );
</script>

<input class="{base} {border} {cls}" bind:value {...rest} />
