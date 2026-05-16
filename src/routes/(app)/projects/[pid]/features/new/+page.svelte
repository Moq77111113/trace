<script lang="ts">
  import Input  from '$lib/components/ui/Input.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let { data, form } = $props();
</script>

<div class="flex-1 min-h-0 overflow-auto p-7 max-md:p-4">
  <section class="max-w-md">
    <h1 class="text-[20px] font-semibold tracking-tight mb-1">New feature</h1>
    <p class="text-[13px] text-ink-3 mb-5">Pick a name and an optional group. The Gherkin starts empty.</p>

    <form method="POST" class="flex flex-col gap-3.5">
      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        Name
        <Input name="name" required placeholder="Login" value={form?.values?.name ?? ''} />
      </label>

      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        Group
        <select
          name="groupId"
          class="h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong cursor-pointer"
        >
          <option value="">Ungrouped</option>
          {#each data.groups as g (g.id)}
            <option value={g.id}>{g.name}</option>
          {/each}
        </select>
      </label>

      {#if form?.error}
        <p class="text-[12px] text-fail-ink">{form.error}</p>
      {/if}

      <div class="mt-1">
        <Button type="submit" variant="primary">Create feature</Button>
      </div>
    </form>
  </section>
</div>
