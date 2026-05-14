<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  type Props = Omit<HTMLTextareaAttributes, 'value'> & {
    value?: string;
  };

  let {
    value = $bindable(''),
    class: cls = '',
    ...rest
  }: Props = $props();
</script>

<textarea
  class="w-full px-3 py-2 text-sm rounded-md bg-surface-900 border border-surface-600 text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:border-accent-500 focus:ring-accent-500/30 resize-vertical {cls}"
  bind:value
  {...rest}
></textarea>
