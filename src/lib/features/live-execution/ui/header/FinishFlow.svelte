<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Kbd    from '$lib/shared/ui/Kbd.svelte';
  import FinishConfirmModal from './FinishConfirmModal.svelte';
  import { useSelection } from '../../model/context';
  import { attachShortcut, onPrimaryKey } from '../../model/shortcuts';

  const selection = useSelection();

  let confirming = $state(false);
  let form: HTMLFormElement;
  let bypassConfirm = false;

  function request(): void {
    if (selection.pendingCount === 0) {
      bypassConfirm = true;
      form.requestSubmit();
    } else {
      confirming = true;
    }
  }

  function cancel(): void {
    confirming = false;
  }

  function confirm(): void {
    confirming     = false;
    bypassConfirm  = true;
    form.requestSubmit();
  }

  $effect(() => attachShortcut(window, onPrimaryKey('enter'), request));
</script>

<Button onclick={request}>
  Finish run <Kbd>⌘↵</Kbd>
</Button>

<form
  bind:this={form}
  action="?/finish"
  method="POST"
  use:enhance={({ cancel: cancelSubmit }) => {
    if (!bypassConfirm) {
      confirming = true;
      cancelSubmit();
      return;
    }
    bypassConfirm = false;
  }}
  hidden
></form>

<FinishConfirmModal
  open={confirming}
  pendingCount={selection.pendingCount}
  onCancel={cancel}
  onConfirm={confirm}
/>
