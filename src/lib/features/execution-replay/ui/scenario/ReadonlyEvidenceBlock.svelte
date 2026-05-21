<script lang="ts">
  import Icon     from '$lib/shared/ui/Icon.svelte';
  import * as m   from '$lib/paraglide/messages';
  import { isImageMime } from '$lib/shared/lib/mime';
  import type { ExecutionPageData } from '$lib/server/executions/read/queries';

  type Attachment = NonNullable<ExecutionPageData>['attachmentsByScenario'][string][number];

  type Props = { attachments: Attachment[] };

  let { attachments }: Props = $props();
</script>

<section class="flex flex-col min-h-0 min-w-0">
  <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium flex items-center gap-1.5">
    <Icon name="Paperclip" size={11} />
    <span>{m.live_execution_evidence_label()}</span>
  </div>
  <p class="text-[11.5px] text-ink-3 mb-2">{m.live_execution_evidence_hint()}</p>
  {#if attachments.length > 0}
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 list-none m-0 p-0">
      {#each attachments as attachment (attachment.id)}
        <li class="border border-border rounded-md overflow-hidden bg-surface">
          <a href="/api/attachments/{attachment.id}" target="_blank" rel="noopener" class="block">
            {#if isImageMime(attachment.mimeType)}
              <img
                src="/api/attachments/{attachment.id}"
                alt={attachment.filename}
                class="block w-full h-20 object-cover border-b border-border"
              />
            {:else}
              <div class="h-20 bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_8px,var(--surface)_8px_16px)] grid place-items-center text-ink-3 font-mono text-[10.5px] border-b border-border">
                {attachment.mimeType.split('/')[0]}
              </div>
            {/if}
            <div class="px-2 py-1.5 text-[11px]">
              <div class="font-medium truncate">{attachment.filename}</div>
              <div class="text-ink-3 mt-0.5 tabular-nums">{(attachment.sizeBytes / 1024).toFixed(1)} KB</div>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="text-[12px] text-ink-3 italic">{m.live_execution_evidence_empty()}</div>
  {/if}
</section>
