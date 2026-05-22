<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import AbortConfirmModal from './AbortConfirmModal.svelte';
  import { useSelection } from '../../model/context';
  import { optimisticAbort } from '../../model/scenario-marking';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import * as m from '$lib/paraglide/messages';

  const selection = useSelection();

  let confirming = $state(false);
  let aborting   = $state(false);
  let abortError = $state<string | null>(null);
  let form: HTMLFormElement;

  function open(): void {
    abortError = null;
    confirming = true;
  }

  function cancel(): void {
    confirming = false;
  }

  function confirm(): void {
    aborting = true;
    form.requestSubmit();
  }
</script>

<Button variant="danger" onclick={open} disabled={aborting}>
  {aborting ? m.execution_abort_aborting() : m.execution_abort_cta()}
</Button>

{#if abortError}
  <span class="text-[12px] text-fail-ink" role="alert">{abortError}</span>
{/if}

<form
  bind:this={form}
  action="?/abort"
  method="POST"
  use:enhance={() => async ({ result, update }) => {
    aborting = false;
    if (result.type === 'failure' || result.type === 'error') {
      abortError = failureMessage(result, 'Abort failed');
      return;
    }
    confirming = false;
    optimisticAbort(selection);
    await update();
  }}
  hidden
></form>

<AbortConfirmModal
  open={confirming}
  pendingCount={selection.pendingCount}
  {aborting}
  onCancel={cancel}
  onConfirm={confirm}
/>
