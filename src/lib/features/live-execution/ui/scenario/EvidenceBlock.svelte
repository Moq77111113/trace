<script lang="ts">
  import { enhance } from '$app/forms';
  import DropZone from '$lib/shared/ui/DropZone.svelte';
  import Icon     from '$lib/shared/ui/Icon.svelte';
  import Gate     from '$lib/shared/authz/Gate.svelte';
  import * as m   from '$lib/paraglide/messages';
  import { useSelection } from '../../model/context';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import { formatFileSize } from '$lib/shared/lib/bytes';
  import type { DroppedFile } from '$lib/shared/io/dropped-files';

  type Uploaded = {
    id:        string;
    filename:  string;
    mimeType:  string;
    sizeBytes: number;
  };

  function isUploaded(v: unknown): v is Uploaded {
    return typeof v === 'object' && v !== null
      && 'id'        in v && typeof v.id        === 'string'
      && 'filename'  in v && typeof v.filename  === 'string'
      && 'mimeType'  in v && typeof v.mimeType  === 'string'
      && 'sizeBytes' in v && typeof v.sizeBytes === 'number';
  }

  function parseUploaded(data: unknown): Uploaded[] {
    if (typeof data !== 'object' || data === null) return [];
    if (!('uploaded' in data) || !Array.isArray(data.uploaded)) return [];
    return data.uploaded.filter(isUploaded);
  }

  const selection = useSelection();

  const uploadsByScenario = $state<Record<string, Uploaded[]>>({});

  let uploading   = $state(false);
  let uploadError = $state<string | null>(null);

  const uploaded = $derived(
    selection.selected ? (uploadsByScenario[selection.selected.id] ?? []) : [],
  );

  let form:      HTMLFormElement;
  let fileInput: HTMLInputElement;
  let pendingScenarioId = '';

  function onDrop(items: DroppedFile[]): void {
    const target = selection.selected;
    if (!target || items.length === 0) return;
    const dt = new DataTransfer();
    for (const item of items) dt.items.add(item.file);
    fileInput.files     = dt.files;
    pendingScenarioId   = target.id;
    form.requestSubmit();
  }
</script>

<section class="flex flex-col min-h-0 min-w-0">
  <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
    {m.live_execution_evidence_label()}
  </div>
  <p class="text-[11.5px] text-ink-3 mb-2">{m.live_execution_evidence_hint()}</p>

  {#if uploaded.length > 0}
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 list-none m-0 p-0 mb-2">
      {#each uploaded as attachment (attachment.id)}
        <li class="border border-border rounded-md overflow-hidden bg-surface">
          <div class="h-20 bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_8px,var(--surface)_8px_16px)] grid place-items-center text-ink-3 font-mono text-[10.5px] border-b border-border">
            {attachment.mimeType.split('/')[0]}
          </div>
          <div class="px-2 py-1.5 text-[11px]">
            <div class="font-medium truncate">{attachment.filename}</div>
            <div class="text-ink-3 mt-0.5 tabular-nums">{formatFileSize(attachment.sizeBytes)}</div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <Gate can="execution.run">
    <form
      bind:this={form}
      action="?/uploadAttachment"
      method="POST"
      enctype="multipart/form-data"
      use:enhance={({ formData }) => {
        const id = pendingScenarioId;
        formData.set('scenarioResultId', id);
        uploading   = true;
        uploadError = null;
        return async ({ result }) => {
          uploading = false;
          if (result.type === 'failure' || result.type === 'error') {
            uploadError = failureMessage(result, 'Upload failed');
            return;
          }
          if (result.type === 'success') {
            const fresh = parseUploaded(result.data);
            uploadsByScenario[id] = [...(uploadsByScenario[id] ?? []), ...fresh];
          }
        };
      }}
      hidden
    >
      <input bind:this={fileInput} type="file" name="files" multiple>
    </form>

    <div class="flex-1 min-h-[88px] grid">
      <DropZone {onDrop}>
        <Icon name="Upload" size={14} />
        <span class="ml-1.5">{m.live_execution_evidence_drop()}</span>
        {#if uploading}<span class="block mt-1 text-[11px]">Uploading…</span>{/if}
      </DropZone>
    </div>
  </Gate>

  <div class="mt-1 min-h-[15px] text-[11px]">
    {#if uploadError}
      <span class="text-fail-ink" role="alert">⚠ {uploadError}</span>
    {/if}
  </div>
</section>
