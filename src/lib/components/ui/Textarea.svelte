<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  type Props = Omit<HTMLTextareaAttributes, 'value'> & {
    value?: string;
    class?: string;
  };

  let {
    value = $bindable(''),
    class: cls = '',
    ...rest
  }: Props = $props();
</script>

<textarea
  class="w-full min-h-[64px] px-2.5 py-2 text-[12.5px] leading-relaxed rounded-md bg-surface text-ink placeholder:text-ink-3 border border-border hover:border-border-strong focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent resize-y {cls}"
  bind:value
  {...rest}
></textarea>
