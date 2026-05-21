<script lang="ts">
  import Button from '$lib/shared/ui/Button.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    saving: boolean;
    onAdd:  (name: string) => void;
  };

  let { saving, onAdd }: Props = $props();

  let newName = $state('');

  function submit(): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    newName = '';
  }
</script>

<div class="flex items-center gap-2">
  <input
    class="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
    placeholder={m.manual_scenarios_placeholder()}
    bind:value={newName}
    onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
  />
  <Button
    type="button"
    variant="primary"
    onclick={submit}
    disabled={saving || newName.trim() === ''}
  >{m.manual_scenarios_add()}</Button>
</div>
