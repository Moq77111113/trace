<script lang="ts">
  import type { Snippet } from 'svelte';
  import { collectDroppedFiles, filterByExtension, type DroppedFile } from '$lib/shared/io/dropped-files';

  type Props = {
    onDrop: (items: DroppedFile[]) => void;
    accept?: string;
    multiple?: boolean;
    directories?: boolean;
    children?: Snippet;
  };
  let { onDrop, accept = '*', multiple = true, directories = false, children }: Props = $props();

  let hover  = $state(false);
  let inputEl: HTMLInputElement;

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    hover = false;
    if (!e.dataTransfer) return;

    const items = directories
      ? await collectDroppedFiles(e.dataTransfer)
      : Array.from(e.dataTransfer.files).map((f) => ({ file: f, path: '' }));
    onDrop(filterByExtension(items, accept));
  }

  function handlePick(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    onDrop(Array.from(files).map((f) => ({ file: f, path: '' })));
  }
</script>

<div
  role="button"
  tabindex="0"
  onclick={() => inputEl.click()}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && inputEl.click()}
  ondragover={(e) => { e.preventDefault(); hover = true; }}
  ondragleave={() => (hover = false)}
  ondrop={handleDrop}
  class="rounded-md border border-dashed p-4 text-center text-[12.5px] cursor-pointer transition-colors
         {hover ? 'border-accent bg-accent-soft text-ink' : 'border-border-strong bg-surface text-ink-3 hover:bg-surface-2 hover:text-ink-2'}"
>
  {#if children}{@render children()}{:else}Drop files here or click to browse{/if}

  <input bind:this={inputEl} type="file" {accept} {multiple} class="hidden" onchange={handlePick} />
</div>
