<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'value'> & {
    invalid?: boolean;
    value?:   string;
    class?:   string;
  };

  let {
    invalid = false,
    value   = $bindable(''),
    class: cls = '',
    ...rest
  }: Props = $props();

  const base =
    'w-full h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink placeholder:text-ink-3 border focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent';
  const border = $derived(invalid ? 'border-fail' : 'border-border hover:border-border-strong');
</script>

<input class="{base} {border} {cls}" bind:value {...rest} />
