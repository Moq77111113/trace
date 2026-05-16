<script lang="ts">
  import Modal from '$lib/shared/ui/Modal.svelte';

  type Props = { open: boolean; onOpenChange: (v: boolean) => void; content: string };
  let { open, onOpenChange, content }: Props = $props();
</script>

<Modal {open} {onOpenChange} title="Feature snapshot at run start">
  <p class="text-[12px] text-ink-3 mb-3">The exact Gherkin text executed by this run. Read-only.</p>
  <pre
    class="px-3 py-2 max-h-[60vh] overflow-auto text-[12px] font-mono whitespace-pre-wrap bg-canvas border border-border rounded-md text-ink-2"
  >{content}</pre>
</Modal>
