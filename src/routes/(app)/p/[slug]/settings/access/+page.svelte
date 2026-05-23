<script lang="ts">
  import PageTitle         from '$lib/shared/ui/PageTitle.svelte';
  import AccessSubjectRow  from '$lib/features/access/ui/AccessSubjectRow.svelte';
  import InviteSubjectForm from '$lib/features/access/ui/InviteSubjectForm.svelte';
  import * as m            from '$lib/paraglide/messages';

  let { data, form } = $props();

  const anyUserGranted = $derived(data.subjects.some((s) => s.subject.kind === 'any-user'));
</script>

<PageTitle title={m.page_title_access()} />

<h1 class="text-[16px] font-semibold tracking-tight mb-1">{m.page_title_access()}</h1>
<p class="text-[13px] text-ink-3 max-w-[56ch] mb-4">{m.access_intro()}</p>

{#if form?.error}
  <p class="text-[12px] text-fail-ink mb-3">{form.error}</p>
{/if}

<InviteSubjectForm users={data.grantableUsers} {anyUserGranted} />

{#if data.subjects.length === 0}
  <p class="text-[13px] text-ink-3">{m.access_empty()}</p>
{:else}
  <div class="bg-surface border border-border rounded-xl overflow-hidden">
    {#each data.subjects as subject (subject.subject.kind === 'user' ? subject.subject.id : 'any-user')}
      <AccessSubjectRow {subject} />
    {/each}
  </div>
{/if}
