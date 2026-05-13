<script lang="ts">
  import type { Snippet }              from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  type Props = HTMLAnchorAttributes & { children: Snippet };
  let { children, href, ...rest }: Props = $props();
</script>

{#if href}
  <a {href} class="block bg-surface-800 border border-surface-600 rounded-md p-4 hover:border-surface-500 transition" {...rest}>
    {@render children()}
  </a>
{:else}
  <div class="bg-surface-800 border border-surface-600 rounded-md p-4">{@render children()}</div>
{/if}
