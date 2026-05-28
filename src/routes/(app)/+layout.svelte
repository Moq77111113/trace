<script lang="ts">
  import PreviewBanner from '$lib/widgets/preview-banner/ui/PreviewBanner.svelte';
  import Sidebar       from '$lib/widgets/sidebar/ui/Sidebar.svelte';
  import Topbar        from '$lib/widgets/topbar/ui/Topbar.svelte';
  import * as m        from '$lib/paraglide/messages';

  let { data, children } = $props();

  let sidebarOpen = $state(false);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<div class="h-screen flex flex-col text-ink bg-canvas">
  <div data-no-print>
    <PreviewBanner />
  </div>

  <div
    class="app grid flex-1 min-h-0 grid-cols-[244px_1fr] max-lg:grid-cols-[220px_1fr] max-md:grid-cols-[1fr]"
    data-sidebar={sidebarOpen ? 'open' : 'closed'}
  >
    <div class="contents" data-no-print>
      <Sidebar projects={data.projects} user={data.user} />
    </div>

    <div class="flex flex-col min-w-0 min-h-0 bg-bg">
      <div data-no-print>
        <Topbar theme={data.theme} onToggleSidebar={toggleSidebar} />
      </div>
      {@render children()}
    </div>

    {#if sidebarOpen}
      <button
        type="button"
        aria-label={m.nav_toggle_sidebar()}
        class="hidden max-md:block fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] cursor-pointer"
        onclick={closeSidebar}
        data-no-print
      ></button>
    {/if}
  </div>
</div>
