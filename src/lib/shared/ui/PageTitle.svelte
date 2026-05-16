<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  type Props = { title: string };
  let { title }: Props = $props();
</script>

<svelte:head>
  <title>{title} · {m.title_suffix()}</title>
</svelte:head>
