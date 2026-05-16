<script lang="ts">
  import Modal  from '$lib/shared/ui/Modal.svelte';
  import Button from '$lib/shared/ui/Button.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    open:         boolean;
    pendingCount: number;
    aborting:     boolean;
    onCancel:     () => void;
    onConfirm:    () => void;
  };

  let { open, pendingCount, aborting, onCancel, onConfirm }: Props = $props();

  const body = $derived(
    pendingCount === 1
      ? m.execution_abort_modal_body_one({ count: pendingCount })
      : m.execution_abort_modal_body_other({ count: pendingCount })
  );
</script>

<Modal
  {open}
  onOpenChange={(v) => { if (!v) onCancel(); }}
  title={m.execution_abort_modal_title()}
>
  <p class="text-[13px]">{body}</p>

  {#snippet footer()}
    <Button variant="ghost"  onclick={onCancel}  disabled={aborting}>
      {m.execution_abort_modal_cancel()}
    </Button>
    <Button variant="danger" onclick={onConfirm} disabled={aborting}>
      {aborting ? m.execution_abort_aborting() : m.execution_abort_modal_confirm()}
    </Button>
  {/snippet}
</Modal>
