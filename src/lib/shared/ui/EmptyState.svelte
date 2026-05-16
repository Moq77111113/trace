<script lang="ts">
  import Icon                from './Icon.svelte';
  import type { IconName }   from './Icon.svelte';
  import type { Snippet }    from 'svelte';

  type Props = { icon?: IconName; title: string; children?: Snippet };
  let { icon = 'Inbox', title, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center gap-3 py-12 text-ink-3">
  <Icon name={icon} size={32} />
  <p class="text-[13px] font-medium text-ink-2">{title}</p>
  {#if children}<div class="text-[12px] text-ink-3">{@render children()}</div>{/if}
</div>
