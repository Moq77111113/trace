<script lang="ts">
  import type { Pathname }           from '$app/types';
  import { resolve }                 from '$app/paths';
  import { page }                    from '$app/state';
  import { locales, localizeHref }   from '$lib/paraglide/runtime';
  import '../app.css';
  import favicon                     from '$lib/assets/favicon.svg';
  import AppHeader                   from '$lib/components/AppHeader.svelte';
  import Toast                       from '$lib/components/ui/Toast.svelte';

  let { data, children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<AppHeader projects={data.projects} />

<main class="max-w-6xl mx-auto px-6 py-6">
  {@render children()}
</main>

<Toast />

<div class="hidden">
  {#each locales as locale (locale)}
    <a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
  {/each}
</div>
