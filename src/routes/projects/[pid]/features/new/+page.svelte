<script lang="ts">
  import Input  from '$lib/components/ui/Input.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let { data, form } = $props();
</script>

<h2 class="text-base font-semibold mb-4">New feature</h2>
<form method="POST" class="space-y-3 max-w-md">
  <Input name="name" required placeholder="Login" value={form?.values?.name ?? ''} />
  <label class="block">
    <span class="text-xs text-surface-400 block mb-1">Group</span>
    <select name="groupId" class="bg-surface-700 border border-surface-600 rounded px-2 py-1.5 w-full text-sm text-surface-100">
      <option value="">Ungrouped</option>
      {#each data.groups as g (g.id)}
        <option value={g.id}>{g.name}</option>
      {/each}
    </select>
  </label>
  {#if form?.error}<p class="text-xs text-state-failed">{form.error}</p>{/if}
  <Button type="submit">Create</Button>
</form>
