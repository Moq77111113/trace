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
  <p class="text-[13px] mb-3">
    <strong class="text-ink font-semibold">{editorName}</strong> saved a new version.
    If you reload, your local work will be <strong class="text-fail-ink">lost</strong>.
  </p>
  <div class="bg-canvas border-l-2 border-accent px-3 py-2 font-mono text-[12px] text-accent-soft-ink rounded-sm">
    v{yourVersion} → v{currentVersion} by {editorName}<br />
    You are editing from v{yourVersion}
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={onCancel}>Cancel</Button>
    <Button variant="primary" onclick={onReload}>Reload</Button>
  {/snippet}
</Modal>
