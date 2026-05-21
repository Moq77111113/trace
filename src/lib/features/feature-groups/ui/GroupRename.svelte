<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import Input from '$lib/shared/ui/Input.svelte';
  import Pill from '$lib/shared/ui/Pill.svelte';

  type Props = {
    groupId:     string;
    initialName: string;
    onCancel:    () => void;
  };

  let { groupId, initialName, onCancel }: Props = $props();

  let renameValue = $state(untrack(() => initialName));
  let renameError = $state<string | null>(null);
</script>

<form
  method="POST"
  action="?/renameGroup"
  use:enhance={() => ({ result, update }) => {
    if (result.type === 'failure') {
      renameError = String(result.data?.error ?? 'unknown');
      return update({ reset: false });
    }
    onCancel();
    return update();
  }}
  class="flex items-center gap-2"
>
  <input type="hidden" name="groupId" value={groupId} />

  <Input
    name="name"
    bind:value={renameValue}
    autofocus
    onkeydown={(e) => { if (e.key === 'Escape') onCancel(); }}
    onblur={(e) => e.currentTarget.form?.requestSubmit()}
  />

  {#if renameError}
    <Pill kind="fail" glyph={false}>
      {renameError === 'duplicate-name' ? 'name taken' : renameError}
    </Pill>
  {/if}
</form>
