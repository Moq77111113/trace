<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';

  import MonacoWrapper, { type EditorApi } from './MonacoWrapper.svelte';
  import ConflictModal from './ConflictModal.svelte';
  import ArchiveModal  from './ArchiveModal.svelte';
  import EditorHeader  from './EditorHeader.svelte';
  import type { Snippet } from '$lib/shared/gherkin/snippets';
  import { FeatureForm }  from '../model/feature-form.svelte';
  import { GherkinParser } from '../model/gherkin-parser.svelte';
  import { SaveFlow }      from '../model/save.svelte';

  type ParseErrors = { line: number; column?: number; message: string }[] | null;

  type Feature = {
    id:          string;
    name:        string;
    codeSeq:     number;
    content:     string;
    version:     number;
    parseErrors: ParseErrors;
    groupId:     string | null;
  };

  type ProjectRef = { codePrefix: string };
  type ProjectTag = { name: string; count: number };
  type Group      = { id: string; name: string };

  type Props = {
    data: { feature: Feature; project: ProjectRef; projectTags: ProjectTag[]; groups: Group[] };
    onSaved?: (feature: Feature) => void;
  };

  let { data, onSaved }: Props = $props();

  const form    = untrack(() => new FeatureForm(data.feature));
  const gherkin = untrack(() => new GherkinParser(() => form.fields.content, data.feature.name, data.projectTags));
  const save    = untrack(() => new SaveFlow(form, () => data.feature, onSaved));

  let archiveOpen                 = $state(false);
  let editorApi: EditorApi | null = $state(null);

  function insertSnippet(snippet: Snippet): void {
    if (!editorApi) return;
    if (snippet.mode === 'replace') editorApi.setText(snippet.content);
    else                            editorApi.appendText(snippet.content);
  }
</script>

<form method="POST" action="?/save" use:enhance={save.onSubmit} class="flex flex-col min-h-0 flex-1">
  <input type="hidden" name="version" value={form.version} />
  <input type="hidden" name="content" value={form.fields.content} />

  <EditorHeader
    featureName={data.feature.name}
    featureCode={`${data.project.codePrefix}-${data.feature.codeSeq}`}
    featureId={data.feature.id}
    version={form.version}
    dirty={form.dirty}
    parseErrors={gherkin.parsed.errors.length}
    groups={data.groups}
    snippets={gherkin.snippets}
    saving={save.saving}
    conflictOpen={save.conflictOpen}
    bind:groupId={form.fields.groupId}
    onGroupChange={(v) => (form.fields.groupId = v)}
    onInsert={insertSnippet}
    onArchive={() => (archiveOpen = true)}
  />

  {#if save.saveError}
    <p class="px-4 py-2 text-[12px] text-fail-ink bg-fail-soft border-b border-fail/30" role="alert">{save.saveError}</p>
  {/if}

  <div class="relative flex-1 min-h-0">
    <MonacoWrapper
      value={form.fields.content}
      onChange={(v) => (form.fields.content = v)}
      markers={gherkin.markers}
      completionProvider={gherkin.completionProvider}
      bind:api={editorApi}
    />

    {#if gherkin.empty}
      <div class="pointer-events-none absolute right-4 top-4 text-[11.5px] text-ink-3 italic bg-surface/85 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-border">
        Empty — use <span class="not-italic font-semibold text-ink">Insert</span> above to start
      </div>
    {/if}
  </div>
</form>

<ConflictModal
  open={save.conflictOpen}
  currentVersion={save.conflictWith?.version ?? form.version}
  yourVersion={form.version}
  editorName={'someone'}
  onReload={save.reload}
  onCancel={save.dismissConflict}
/>

<ArchiveModal
  open={archiveOpen}
  featureName={data.feature.name}
  onOpenChange={(v) => (archiveOpen = v)}
/>
