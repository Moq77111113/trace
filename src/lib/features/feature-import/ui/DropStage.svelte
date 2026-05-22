<script lang="ts">
  import { enhance } from '$app/forms';
  import DropZone from '$lib/shared/ui/DropZone.svelte';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import { isPreviewResult } from '../model/action-results';
  import type { ImportState } from '../model/import-state.svelte';
  import type { DroppedFile } from '$lib/shared/io/dropped-files';

  type Props = { flow: ImportState };
  let { flow }: Props = $props();

  let uploading = $state(false);
  let form:      HTMLFormElement;
  let filesInput: HTMLInputElement;
  let groupsInput: HTMLInputElement;
  let pendingFiles:  File[]          = [];
  let pendingGroups: (string | null)[] = [];

  function onDrop(items: DroppedFile[]): void {
    if (items.length === 0) {
      flow.error = 'No .feature files found in the drop';
      return;
    }
    pendingFiles  = items.map((i) => i.file);
    pendingGroups = items.map((i) => parentFolder(i.path));

    const dt = new DataTransfer();
    for (const file of pendingFiles) dt.items.add(file);
    filesInput.files = dt.files;

    form.requestSubmit();
  }

  function parentFolder(path: string): string | null {
    if (!path) return null;
    const idx = path.lastIndexOf('/');
    if (idx <= 0) return null;
    return path.slice(0, idx).split('/').pop() ?? null;
  }
</script>

<form
  bind:this={form}
  action="?/preview"
  method="POST"
  enctype="multipart/form-data"
  use:enhance={({ formData }) => {
    formData.delete('groups');
    for (const group of pendingGroups) formData.append('groups', group ?? '');
    flow.error = null;
    uploading  = true;
    return async ({ result }) => {
      uploading = false;
      if (result.type === 'failure' || result.type === 'error') {
        flow.error = failureMessage(result, 'Upload failed');
        return;
      }
      if (result.type === 'success' && isPreviewResult(result.data)) {
        flow.applyPreview(result.data.preview);
      }
    };
  }}
  hidden
>
  <input bind:this={filesInput}  type="file" name="files" multiple>
  <input bind:this={groupsInput} type="hidden" name="groups" value="">
</form>

<DropZone accept=".feature" multiple directories {onDrop}>
  {#if uploading}
    Parsing files…
  {:else}
    <p>Drop <code class="font-mono">.feature</code> files here, or click to browse</p>
    <p class="text-[11.5px] mt-1 text-ink-mute">Up to 100 files · 1 MB per file</p>
  {/if}
</DropZone>

{#if flow.error}
  <p class="mt-3 text-[12px] text-fail-ink">{flow.error}</p>
{/if}
