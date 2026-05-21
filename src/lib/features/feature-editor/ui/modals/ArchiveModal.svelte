<script lang="ts">
  import { enhance } from '$app/forms';
  import Modal  from '$lib/shared/ui/Modal.svelte';
  import Button from '$lib/shared/ui/Button.svelte';

  type Props = {
    open:        boolean;
    featureName: string;
    onOpenChange: (v: boolean) => void;
  };

  let { open, featureName, onOpenChange }: Props = $props();

  let archiving: boolean = $state(false);
  let form: HTMLFormElement | undefined = $state();

  function confirm(): void {
    if (!form) return;
    archiving = true;
    form.requestSubmit();
  }
</script>

<form bind:this={form} method="POST" action="?/archive" use:enhance></form>

<Modal {open} {onOpenChange} title="Archive feature">
  <p>Archive <strong>{featureName}</strong>?</p>
  <p class="text-[12px] text-ink-3 mt-2">
    It will be hidden from this project. Existing run history is preserved.
  </p>

  {#snippet footer()}
    <Button variant="ghost"  onclick={() => onOpenChange(false)}>Cancel</Button>
    <Button variant="danger" disabled={archiving} onclick={confirm}>Archive</Button>
  {/snippet}
</Modal>
