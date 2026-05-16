<script lang="ts">
  import Input    from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button   from '$lib/components/ui/Button.svelte';

  let { form } = $props();
</script>

<div class="flex-1 min-h-0 overflow-auto p-7 max-md:p-4">
  <section class="max-w-md">
    <h1 class="text-[20px] font-semibold tracking-tight mb-1">New project</h1>
    <p class="text-[13px] text-ink-3 mb-5">Set up a workspace for a set of feature files.</p>

    <form method="POST" class="flex flex-col gap-3.5">
      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        Name
        <Input id="name" name="name" required value={form?.values?.name ?? ''} />
      </label>

      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        Description
        <Textarea id="description" name="description" rows={3} value={form?.values?.description ?? ''} />
      </label>

      {#if form?.error}
        <p class="text-[12px] text-fail-ink">{form.error}</p>
      {/if}

      <div class="mt-1">
        <Button type="submit" variant="primary">Create project</Button>
      </div>
    </form>
  </section>
</div>
