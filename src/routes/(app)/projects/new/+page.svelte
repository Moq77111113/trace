<script lang="ts">
  import Input    from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button   from '$lib/components/ui/Button.svelte';

  let { form } = $props();
</script>

<h1 class="text-lg font-semibold mb-4">New project</h1>
<form method="POST" class="space-y-3 max-w-md">
  <div>
    <label class="block text-xs text-surface-400 mb-1" for="name">Name</label>
    <Input id="name" name="name" required value={form?.values?.name ?? ''} />
  </div>
  <div>
    <label class="block text-xs text-surface-400 mb-1" for="description">Description</label>
    <Textarea id="description" name="description" rows={3} value={form?.values?.description ?? ''} />
  </div>
  {#if form?.error}<p class="text-xs text-state-failed">{form.error}</p>{/if}
  <Button type="submit">Create</Button>
</form>
