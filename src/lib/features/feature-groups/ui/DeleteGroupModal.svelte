<script lang="ts">
  import Button from '$lib/shared/ui/Button.svelte';
  import Modal  from '$lib/shared/ui/Modal.svelte';
  import { enhance } from '$app/forms';

  export type DeleteGroupTarget = { id: string; name: string; count: number };

  type Props = {
    target:   DeleteGroupTarget | null;
    onClose:  () => void;
  };

  let { target, onClose }: Props = $props();
</script>

<Modal open={target !== null} onOpenChange={(v) => { if (!v) onClose(); }} title="Delete group?">
  {#if target}
    <p>
      Delete group <strong>{target.name}</strong>?
      {#if target.count === 0}
        It has no features.
      {:else}
        Its {target.count} feature{target.count === 1 ? '' : 's'} will be moved to <em>Ungrouped</em>.
      {/if}
    </p>
    <form
      method="POST"
      action="?/deleteGroup"
      use:enhance={() =>
        ({ result, update }) => {
          if (result.type === 'failure') return update({ reset: false });
          onClose();
          return update();
        }}
      class="flex items-center justify-end gap-2 mt-4"
    >
      <input type="hidden" name="groupId" value={target.id} />
      <Button variant="ghost" onclick={onClose} type="button">Cancel</Button>
      <Button type="submit" variant="danger">Delete</Button>
    </form>
  {/if}
</Modal>
