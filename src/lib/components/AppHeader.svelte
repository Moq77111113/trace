<script lang="ts">
  import { page }   from '$app/state';
  import { goto }   from '$app/navigation';
  import Icon       from '$lib/components/ui/Icon.svelte';
  import Select     from '$lib/components/ui/Select.svelte';
  import UserMenu   from '$lib/components/UserMenu.svelte';

  type Props = {
    projects: { id: string; name: string }[];
    user:     { id: string; email: string; name: string | null };
  };
  let { projects, user }: Props = $props();

  const currentProjectId = $derived(page.params.pid ?? '');
  const options          = $derived(projects.map((p) => ({ value: p.id, label: p.name })));
</script>

<header class="h-12 bg-surface-800 border-b border-surface-700 px-5 flex items-center justify-between">
  <div class="flex items-center gap-6">
    <a href="/" class="flex items-center gap-2 text-surface-100 font-semibold">
      <Icon name="Play" size={16} class="text-accent-400" /> Trace
    </a>

    {#if currentProjectId && options.length > 0}
      <Select value={currentProjectId} options={options} onValueChange={(id) => goto(`/projects/${id}`)} />
    {/if}
  </div>

  <UserMenu {user} />
</header>
