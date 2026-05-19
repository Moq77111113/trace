<script lang="ts">
  import Button       from '$lib/shared/ui/Button.svelte';
  import Icon         from '$lib/shared/ui/Icon.svelte';
  import EmptyState   from '$lib/shared/ui/EmptyState.svelte';
  import PageTitle    from '$lib/shared/ui/PageTitle.svelte';
  import ProjectStats        from '$lib/entities/project/ui/ProjectStats.svelte';
  import NewGroupButton   from '$lib/features/feature-groups/ui/NewGroupButton.svelte';
  import GroupList        from '$lib/features/feature-groups/ui/GroupList.svelte';

  let { data } = $props();

  const isEmpty = $derived(data.tree.groups.length === 0 && data.tree.ungrouped.length === 0);
</script>

<PageTitle title={data.project.name} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <header class="flex items-end justify-between gap-4 mb-4 max-md:flex-col max-md:items-stretch">
    <div>
      <h1 class="text-[20px] font-semibold tracking-tight">{data.project.name}</h1>
      {#if data.project.description}
        <p class="text-[13px] text-ink-3 mt-1">{data.project.description}</p>
      {/if}
    </div>
    <div class="flex items-center gap-2 max-md:flex-wrap">
      <NewGroupButton />
      <Button variant="primary" href="/p/{data.project.slug}/new">
        <Icon name="Plus" size={13} /> New feature
      </Button>
    </div>
  </header>

  <ProjectStats stats={data.stats} flakyCount={data.flakeFeatureIds.size} />

  {#if isEmpty}
    <EmptyState title="No features yet" />
  {:else}
    <GroupList
      projectId={data.project.id}
      groups={data.tree.groups}
      ungrouped={data.tree.ungrouped}
      flakeFeatureIds={data.flakeFeatureIds}
    />
  {/if}
</div>
