<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Topbar  from '$lib/components/Topbar.svelte';

  let { data, children } = $props();

  let sidebarOpen = $state(false);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<div
  class="app grid h-screen text-ink bg-canvas grid-cols-[244px_1fr] max-lg:grid-cols-[220px_1fr] max-md:grid-cols-[1fr]"
  data-sidebar={sidebarOpen ? 'open' : 'closed'}
>
  <Sidebar projects={data.projects} user={data.user} />

  <div class="flex flex-col min-w-0 min-h-0 bg-bg">
    <Topbar theme={data.theme} onToggleSidebar={toggleSidebar} />
    {@render children()}
  </div>

  {#if sidebarOpen}
    <button
      type="button"
      aria-label="Close sidebar"
      class="hidden max-md:block fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] cursor-pointer"
      onclick={closeSidebar}
    ></button>
  {/if}
</div>
