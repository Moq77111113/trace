<script lang="ts">
  import { enhance } from '$app/forms';
  import Modal from '$lib/shared/ui/Modal.svelte';
  import Button from '$lib/shared/ui/Button.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = { open: boolean; onOpenChange: (v: boolean) => void };
  let { open, onOpenChange }: Props = $props();

  let closing = $state(false);
  let form: HTMLFormElement | undefined = $state();

  function confirm(): void {
    if (!form) return;
    closing = true;
    form.requestSubmit();
  }
</script>

<form bind:this={form} method="POST" action="?/close" use:enhance></form>

<Modal {open} {onOpenChange} title={m.campaign_close_title()}>
  <p>{m.campaign_close_body()}</p>

  {#snippet footer()}
    <Button variant="ghost" onclick={() => onOpenChange(false)}>{m.cancel()}</Button>
    <Button variant="danger" disabled={closing} onclick={confirm}>{m.campaign_close_confirm()}</Button>
  {/snippet}
</Modal>
