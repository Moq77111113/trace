<script lang="ts">
  import Button from '$lib/shared/ui/Button.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';

  type Props = { projectId: string };
  let { projectId }: Props = $props();
</script>

<div class="bg-surface border border-border rounded-xl px-4 py-5 flex items-start gap-3">
  <Icon name="Key" size={18} class="text-ink-3 shrink-0 mt-0.5" />
  <div class="flex-1">
    <h2 class="text-[14px] font-medium mb-1">No API key yet</h2>
    <p class="text-[12.5px] text-ink-3 max-w-[52ch] mb-3">
      CI ingestion authenticates with a project-scoped bearer token.
      Create one before pasting the snippet into your pipeline.
    </p>
    <Button href="/projects/{projectId}/settings/api-keys" variant="primary" size="sm">
      <Icon name="Plus" size={13} /> Create an API key
    </Button>
  </div>
</div>
