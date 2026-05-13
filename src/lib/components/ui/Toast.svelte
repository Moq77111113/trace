<script lang="ts">
  import { toasts } from '$lib/toast.svelte';
  import type { Toast } from '$lib/toast.svelte';

  const palette = {
    info:    'bg-surface-700 text-surface-100',
    success: 'bg-state-passed/90 text-white',
    error:   'bg-state-failed/90 text-white',
  } satisfies Record<Toast['kind'], string>;
</script>

<div class="fixed bottom-4 right-4 flex flex-col gap-2 z-[100]">
  {#each toasts.list as t (t.id)}
    <div role="status" class="px-4 py-2 rounded-md shadow-lg text-sm {palette[t.kind]}">
      {t.message}
    </div>
  {/each}
</div>
