<script lang="ts">
  import { page } from '$app/state';
  import BrandHeader   from './BrandHeader.svelte';
  import ProjectChip   from './ProjectChip.svelte';
  import PrimaryNav    from './PrimaryNav.svelte';
  import ProjectsList  from './ProjectsList.svelte';
  import FeatureTree   from './FeatureTree.svelte';
  import SidebarFooter from './SidebarFooter.svelte';
  import * as m from '$lib/paraglide/messages';

  type Project = { id: string; name: string };
  type FeatureRow = { id: string; name: string; latestFinishedStatus?: string | null };
  type GroupRow   = { id: string; name: string };
  type Tree       = { groups: { group: GroupRow; features: FeatureRow[] }[]; ungrouped: FeatureRow[] };
  type User       = { id: string; email: string; name: string | null };

  type Props = {
    projects: Project[];
    user:     User;
  };

  let { projects, user }: Props = $props();

  const project         = $derived(page.data.project as Project | undefined);
  const tree            = $derived(page.data.tree as Tree | undefined);
  const flakeFeatureIds = $derived(page.data.flakeFeatureIds as Set<string> | undefined);

  const sections = $derived(
    project
      ? ([
          { key: 'overview',   label: m.nav_overview(),   icon: 'Home',     href: `/projects/${project.id}` },
          { key: 'executions', label: m.nav_executions(), icon: 'History',  href: `/projects/${project.id}/executions` },
          { key: 'import',     label: m.nav_import(),     icon: 'Upload',   href: `/projects/${project.id}/import` },
          { key: 'export',     label: m.nav_export(),     icon: 'Download', href: `/projects/${project.id}/export` },
          { key: 'keys',       label: m.nav_api_keys(),   icon: 'Key',      href: `/projects/${project.id}/settings/api-keys` },
        ] as const)
      : ([{ key: 'home', label: m.nav_projects(), icon: 'Home', href: '/' }] as const)
  );

  function activeSection(pathname: string): string {
    if (!project) return 'home';
    const base = `/projects/${project.id}`;
    if (pathname.startsWith(`${base}/settings`))   return 'keys';
    if (pathname.startsWith(`${base}/executions`)) return 'executions';
    if (pathname.startsWith(`${base}/import`))     return 'import';
    if (pathname.startsWith(`${base}/export`))     return 'export';
    return 'overview';
  }

  const activeKey       = $derived(activeSection(page.url.pathname));
  const activeFeatureId = $derived(page.url.pathname.match(/\/features\/([^/]+)/)?.[1] ?? null);
  const showTree        = $derived(!!project && !!tree && (tree.groups.length > 0 || tree.ungrouped.length > 0));
</script>

<aside
  class="flex flex-col min-h-0 border-r border-border bg-canvas
         max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-[280px] max-md:z-50
         max-md:-translate-x-full max-md:transition-transform max-md:duration-200
         max-md:[.app[data-sidebar=open]_&]:translate-x-0
         max-md:shadow-[var(--shadow-pop)]"
>
  <BrandHeader />

  {#if project}
    <ProjectChip name={project.name} projectCount={projects.length} />
  {/if}

  <PrimaryNav {sections} {activeKey} />

  {#if !project && projects.length > 0}
    <ProjectsList {projects} />
  {/if}

  {#if showTree && project && tree}
    <FeatureTree projectId={project.id} {tree} {activeFeatureId} {flakeFeatureIds} />
  {/if}

  <SidebarFooter {user} />
</aside>
