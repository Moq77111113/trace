<script lang="ts">
  import Icon                from './Icon.svelte';
  import type { IconName }   from './Icon.svelte';
  import type { Snippet }    from 'svelte';

  type Props = { icon?: IconName; title: string; children?: Snippet };
  let { icon = 'Inbox', title, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center gap-3 py-12 text-surface-400">
  <Icon name={icon} size={32} />

  <p class="text-sm font-medium text-surface-200">{title}</p>

  {#if children}<div class="text-xs">{@render children()}</div>{/if}
</div>
