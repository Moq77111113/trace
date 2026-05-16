<script lang="ts">
  import type { Snippet }              from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  type Props = HTMLAnchorAttributes & {
    children: Snippet;
    class?:   string;
  };

  let { children, href, class: cls = '', ...rest }: Props = $props();

  const base = 'block bg-surface border border-border rounded-xl p-4';
  const link = 'hover:border-border-strong transition-colors';
</script>

{#if href}
  <a {href} class="{base} {link} {cls}" {...rest}>
    {@render children()}
  </a>
{:else}
  <div class="{base} {cls}">{@render children()}</div>
{/if}
