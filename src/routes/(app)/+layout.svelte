<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Toast     from '$lib/components/ui/Toast.svelte';

  let { data, children } = $props();
</script>

<AppHeader projects={data.projects} user={data.user} />

<main class="max-w-6xl mx-auto px-6 py-6">
  {@render children()}
</main>

<Toast />
