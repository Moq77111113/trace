<script lang="ts">
  import type { StepAttachmentView } from '$lib/entities/execution/lib/step-attachments';
  import { isImageMime } from '$lib/shared/lib/mime';
  import { formatFileSize } from '$lib/shared/lib/bytes';

  type Props = { attachments: StepAttachmentView[] };
  let { attachments }: Props = $props();
</script>

{#if attachments.length > 0}
  <ul class="flex flex-col gap-2 list-none p-0 m-0">
    {#each attachments as att (att.id)}
      <li>
        {#if isImageMime(att.mimeType)}
          <img src="/api/attachments/{att.id}" alt={att.filename} class="max-w-full border border-border rounded-md" />
        {:else}
          <span class="text-[12px] font-mono text-ink-3">{att.filename}, {formatFileSize(att.sizeBytes)}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
