<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';

  type Props = { open: boolean; onOpenChange: (v: boolean) => void; content: string };
  let { open, onOpenChange, content }: Props = $props();
</script>

<Modal {open} {onOpenChange} title="Feature snapshot at run start">
  <p class="text-xs text-surface-400 mb-3">The exact Gherkin text executed by this run. Read-only.</p>
  <pre class="px-3 py-2 max-h-[60vh] overflow-auto text-xs font-mono whitespace-pre-wrap bg-surface-900 border border-surface-700 rounded text-surface-200">{content}</pre>
</Modal>
