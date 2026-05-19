<script lang="ts">
  import { untrack } from 'svelte';
  import Input     from '$lib/shared/ui/Input.svelte';
  import Textarea  from '$lib/shared/ui/Textarea.svelte';
  import Button    from '$lib/shared/ui/Button.svelte';
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import { inferCodePrefix, kebab } from '$lib/shared/lib/slug';
  import * as m    from '$lib/paraglide/messages';

  let { form } = $props();

  let name        = $state(untrack(() => form?.values?.name        ?? ''));
  let slug        = $state(untrack(() => form?.values?.slug        ?? ''));
  let codePrefix  = $state(untrack(() => form?.values?.codePrefix  ?? ''));
  let description = $state(untrack(() => form?.values?.description ?? ''));

  let slugTouched   = $state(untrack(() => !!form?.values?.slug));
  let prefixTouched = $state(untrack(() => !!form?.values?.codePrefix));

  $effect(() => {
    if (slugTouched) return;
    const trimmed = name.trim();
    slug = trimmed.length >= 2 ? kebab(trimmed) : '';
  });

  $effect(() => {
    if (prefixTouched) return;
    codePrefix = slug.length >= 2 ? inferCodePrefix(slug) : '';
  });

  const slugInvalid   = $derived(form?.field === 'slug');
  const prefixExample = $derived(codePrefix.length >= 2 ? codePrefix : 'code');
</script>

<PageTitle title={m.page_title_new_project()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-md:p-4">
  <section class="max-w-md">
    <h1 class="text-[20px] font-semibold tracking-tight mb-1">{m.page_title_new_project()}</h1>
    <p class="text-[13px] text-ink-3 mb-5">{m.new_project_subtitle()}</p>

    <form method="POST" class="flex flex-col gap-3.5">
      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        {m.new_project_name()}
        <Input
          id="name"
          name="name"
          required
          bind:value={name}
        />
      </label>

      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        {m.new_project_slug()}
        <Input
          id="slug"
          name="slug"
          required
          invalid={slugInvalid}
          bind:value={slug}
          oninput={() => (slugTouched = true)}
        />
      </label>

      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        {m.new_project_code_prefix()}
        <Input
          id="codePrefix"
          name="codePrefix"
          required
          bind:value={codePrefix}
          oninput={() => (prefixTouched = true)}
        />
        <span class="text-[11px] text-ink-3 normal-case tracking-normal font-normal mt-0.5">
          {m.new_project_code_prefix_hint().replace(/code/g, prefixExample)}
        </span>
      </label>

      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        {m.new_project_description()}
        <Textarea id="description" name="description" rows={3} bind:value={description} />
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
