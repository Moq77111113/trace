<script lang="ts">
  import Modal  from '$lib/shared/ui/Modal.svelte';
  import Button from '$lib/shared/ui/Button.svelte';

  type Props = {
    open:         boolean;
    pendingCount: number;
    onCancel:     () => void;
    onConfirm:    () => void;
  };

  let { open, pendingCount, onCancel, onConfirm }: Props = $props();
</script>

<Modal
  {open}
  onOpenChange={(v) => { if (!v) onCancel(); }}
  title="Finish run with pending scenarios?"
>
  <p class="text-[13px]">
    <strong class="text-ink font-semibold">{pendingCount}</strong>
    scenario{pendingCount === 1 ? '' : 's'} still pending.
    They will be marked <strong class="text-ink font-semibold">SKIPPED</strong>.
  </p>

  {#snippet footer()}
    <Button variant="ghost"   onclick={onCancel}>Cancel</Button>
    <Button variant="primary" onclick={onConfirm}>Confirm finish</Button>
  {/snippet}
</Modal>
