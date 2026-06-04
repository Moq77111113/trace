<script lang="ts">
  import type { StepAttachmentView } from '$lib/entities/execution/lib/step-attachments';

  type Props = { attachments: StepAttachmentView[] };
  let { attachments }: Props = $props();

  const isImage = (mime: string): boolean => mime.startsWith('image/');
  const fmtSize = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
</script>

{#if attachments.length > 0}
  <ul class="ml-[22px] flex flex-col gap-2 list-none p-0 m-0">
    {#each attachments as att (att.id)}
      <li>
        {#if isImage(att.mimeType)}
          <img src="/api/attachments/{att.id}" alt={att.filename} class="max-w-full border border-border rounded-md" />
        {:else}
          <span class="text-[12px] font-mono text-ink-3">{att.filename}, {fmtSize(att.sizeBytes)}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
