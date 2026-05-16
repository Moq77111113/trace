<script lang="ts">
  import Input     from '$lib/shared/ui/Input.svelte';
  import Textarea  from '$lib/shared/ui/Textarea.svelte';
  import Button    from '$lib/shared/ui/Button.svelte';
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import * as m    from '$lib/paraglide/messages';

  let { form } = $props();
</script>

<PageTitle title={m.page_title_new_project()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-md:p-4">
  <section class="max-w-md">
    <h1 class="text-[20px] font-semibold tracking-tight mb-1">{m.page_title_new_project()}</h1>
    <p class="text-[13px] text-ink-3 mb-5">{m.new_project_subtitle()}</p>

    <form method="POST" class="flex flex-col gap-3.5">
      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        {m.new_project_name()}
        <Input id="name" name="name" required value={form?.values?.name ?? ''} />
      </label>

      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        {m.new_project_description()}
        <Textarea id="description" name="description" rows={3} value={form?.values?.description ?? ''} />
      </label>

      {#if form?.error}
        <p class="text-[12px] text-fail-ink">{form.error}</p>
      {/if}

      <div class="mt-1">
        <Button type="submit" variant="primary">{m.new_project_submit()}</Button>
      </div>
    </form>
  </section>
</div>
