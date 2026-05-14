<script lang="ts">
  import Modal  from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  type Props = {
    open:           boolean;
    currentVersion: number;
    yourVersion:    number;
    editorName:     string;
    onReload:       () => void;
    onCancel:       () => void;
  };

  let { open, currentVersion, yourVersion, editorName, onReload, onCancel }: Props = $props();
</script>

<Modal {open} onOpenChange={(v) => { if (!v) onCancel(); }} title="This feature was modified">
  <p class="text-sm mb-3">
    <strong class="text-surface-100">{editorName}</strong> saved a new version.
    If you reload, your local work will be <strong class="text-state-running">lost</strong>.
  </p>
  <div class="bg-surface-900 border-l-2 border-accent-500 px-3 py-2 font-mono text-xs text-accent-400 rounded-sm">
    v{yourVersion} → v{currentVersion} by {editorName}<br />
    You are editing from v{yourVersion}
  </div>

  {#snippet footer()}
    <Button variant="secondary" onclick={onCancel}>Cancel</Button>
    <Button onclick={onReload}>Reload</Button>
  {/snippet}
</Modal>
