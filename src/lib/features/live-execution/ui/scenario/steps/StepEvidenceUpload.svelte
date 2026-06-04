<script lang="ts">
  import { enhance } from '$app/forms';
  import DropZone from '$lib/shared/ui/DropZone.svelte';
  import Icon     from '$lib/shared/ui/Icon.svelte';
  import Gate     from '$lib/shared/authz/Gate.svelte';
  import * as m   from '$lib/paraglide/messages';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import type { DroppedFile } from '$lib/shared/io/dropped-files';

  type Props = { step: { id: string; scenarioResultId: string } };
  let { step }: Props = $props();

  let uploading   = $state(false);
  let uploadError = $state<string | null>(null);

  let form:      HTMLFormElement;
  let fileInput: HTMLInputElement;

  function onDrop(items: DroppedFile[]): void {
    if (items.length === 0) return;
    const dt = new DataTransfer();
    for (const item of items) dt.items.add(item.file);
    fileInput.files = dt.files;
    form.requestSubmit();
  }
</script>

<Gate can="execution.run">
  <form
    bind:this={form}
    action="?/uploadAttachment"
    method="POST"
    enctype="multipart/form-data"
    use:enhance={({ formData }) => {
      formData.set('scenarioResultId',     step.scenarioResultId);
      formData.set('scenarioResultStepId', step.id);
      uploading   = true;
      uploadError = null;
      return async ({ result }) => {
        uploading = false;
        if (result.type === 'failure' || result.type === 'error') {
          uploadError = failureMessage(result, 'Upload failed');
        }
      };
    }}
    hidden
  >
    <input bind:this={fileInput} type="file" name="files" multiple>
  </form>

  <DropZone {onDrop}>
    <Icon name="Upload" size={14} />
    <span class="ml-1.5">{m.live_step_evidence_add()}</span>
    {#if uploading}<span class="block mt-1 text-[11px]">…</span>{/if}
  </DropZone>

  <div class="min-h-[15px] text-[11px]">
    {#if uploadError}
      <span class="text-fail-ink" role="alert">⚠ {uploadError}</span>
    {/if}
  </div>
</Gate>
