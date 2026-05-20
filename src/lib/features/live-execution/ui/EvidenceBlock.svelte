<script lang="ts">
  import DropZone from '$lib/shared/ui/DropZone.svelte';
  import Icon     from '$lib/shared/ui/Icon.svelte';
  import * as m   from '$lib/paraglide/messages';
  import type { AttachmentsUploader } from '../model/attachments-uploader.svelte';
  import type { ScenarioSelection }   from '../model/selection.svelte';

  type Props = {
    selection:    ScenarioSelection;
    attachments:  AttachmentsUploader;
    scenarioName: string;
  };

  let { selection, attachments, scenarioName }: Props = $props();

  const uploaded = $derived(
    selection.selected ? (attachments.uploadsByScenario[selection.selected.id] ?? []) : [],
  );
</script>

<section class="flex flex-col min-h-0">
  <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium flex items-center gap-1.5">
    <Icon name="Paperclip" size={11} />
    <span class="truncate">{m.live_execution_evidence_label({ scenarioName })}</span>
  </div>

  {#if uploaded.length > 0}
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 list-none m-0 p-0 mb-2">
      {#each uploaded as attachment (attachment.id)}
        <li class="border border-border rounded-md overflow-hidden bg-surface">
          <div class="h-20 bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_8px,var(--surface)_8px_16px)] grid place-items-center text-ink-3 font-mono text-[10.5px] border-b border-border">
            {attachment.mimeType.split('/')[0]}
          </div>
          <div class="px-2 py-1.5 text-[11px]">
            <div class="font-medium truncate">{attachment.filename}</div>
            <div class="text-ink-3 mt-0.5 tabular-nums">{(attachment.sizeBytes / 1024).toFixed(1)} KB</div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <DropZone onDrop={(items) => attachments.upload(items.map((i) => i.file))}>
    <Icon name="Upload" size={14} />
    <span class="ml-1.5">{m.live_execution_evidence_drop()}</span>
    {#if attachments.uploading}<span class="block mt-1 text-[11px]">Uploading…</span>{/if}
  </DropZone>

  {#if attachments.uploadError}
    <p class="mt-2 text-[11.5px] text-fail-ink" role="alert">{attachments.uploadError}</p>
  {/if}
</section>
