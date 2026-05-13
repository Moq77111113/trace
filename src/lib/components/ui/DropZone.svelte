<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = { onDrop: (files: File[]) => void; accept?: string; multiple?: boolean; children?: Snippet };
  let { onDrop, accept = '*', multiple = true, children }: Props = $props();

  let hover  = $state(false);
  let inputEl: HTMLInputElement;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    hover = false;
    if (e.dataTransfer?.files) onDrop(Array.from(e.dataTransfer.files));
  }

  function handlePick(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files) onDrop(Array.from(files));
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
  class="rounded-md border border-dashed p-4 text-center text-sm cursor-pointer transition
         {hover ? 'border-accent-500 bg-accent-500/10 text-surface-100' : 'border-surface-600 bg-surface-800 text-surface-400 hover:bg-surface-700'}"
>
  {#if children}{@render children()}{:else}Drop files here or click to browse{/if}

  <input bind:this={inputEl} type="file" {accept} {multiple} class="hidden" onchange={handlePick} />
</div>
