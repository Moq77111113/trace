<script lang="ts">
  import { page }                    from '$app/state';
  import { locales, localizeHref }   from '$lib/paraglide/runtime';
  import '../app.css';
  import favicon                     from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}

<div class="hidden">
  {#each locales as locale (locale)}
    <a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
  {/each}
</div>
