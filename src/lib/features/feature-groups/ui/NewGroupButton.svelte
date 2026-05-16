<script lang="ts">
  import Button  from '$lib/shared/ui/Button.svelte';
  import Icon    from '$lib/shared/ui/Icon.svelte';
  import Modal   from '$lib/shared/ui/Modal.svelte';
  import Input   from '$lib/shared/ui/Input.svelte';
  import { enhance } from '$app/forms';

  let open  = $state(false);
  let name  = $state('');
  let error = $state<string | null>(null);

  function openCreate() {
    name  = '';
    error = null;
    open  = true;
  }
</script>

<Button variant="secondary" onclick={openCreate}>
  <Icon name="Plus" size={13} /> New group
</Button>

<Modal open={open} onOpenChange={(v) => (open = v)} title="New group">
  <form
    method="POST"
    action="?/createGroup"
    use:enhance={() =>
      ({ result, update }) => {
        if (result.type === 'failure') {
          error = String(result.data?.error ?? 'unknown');
          return update({ reset: false });
        }
        open = false;
        return update();
      }}
  >
    <Input name="name" bind:value={name} placeholder="Authentication" autofocus />
    {#if error}
      <p class="mt-2 text-[12px] text-fail-ink">
        {error === 'duplicate-name' ? 'A group with this name already exists.' : error}
      </p>
    {/if}
    <div class="flex items-center justify-end gap-2 mt-4">
      <Button variant="ghost" onclick={() => (open = false)} type="button">Cancel</Button>
      <Button type="submit" variant="primary">Create</Button>
    </div>
  </form>
</Modal>
