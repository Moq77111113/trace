<script lang="ts">
  import Input  from '$lib/components/ui/Input.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let { form } = $props();
</script>

<h2 class="text-base font-semibold mb-4">New feature</h2>
<form method="POST" class="space-y-3 max-w-md">
  <Input name="name" required placeholder="Login" value={form?.values?.name ?? ''} />
  {#if form?.error}<p class="text-xs text-state-failed">{form.error}</p>{/if}
  <Button type="submit">Create</Button>
</form>
