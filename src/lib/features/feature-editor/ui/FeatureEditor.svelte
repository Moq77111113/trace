<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';

  import type { EditorApi } from './MonacoWrapper.svelte';
  import EditorHeader    from './EditorHeader.svelte';
  import ConflictModal   from './modals/ConflictModal.svelte';
  import ArchiveModal    from './modals/ArchiveModal.svelte';
  import Description     from './sections/Description.svelte';
  import Gherkin         from './sections/Gherkin.svelte';
  import SaveError       from './parts/SaveError.svelte';
  import type { Snippet } from '$lib/shared/gherkin/snippets';
  import { FeatureForm }   from '../model/feature-form.svelte';
  import { GherkinParser } from '../model/gherkin-parser.svelte';
  import { SaveFlow }      from '../model/save.svelte';

  type ParseErrors = { line: number; column?: number; message: string }[] | null;

  type Feature = {
    id:          string;
    name:        string;
    codeSeq:     number;
    content:     string;
    description: string | null;
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
  <input type="hidden" name="version"     value={form.version} />
  <input type="hidden" name="content"     value={form.fields.content} />
  <input type="hidden" name="description" value={form.fields.description} />

  <EditorHeader
    featureName={data.feature.name}
    featureCode={`${data.project.codePrefix}-${data.feature.codeSeq}`}
    featureId={data.feature.id}
    version={form.version}
    dirty={form.dirty}
    groups={data.groups}
    saving={save.saving}
    conflictOpen={save.conflictOpen}
    bind:groupId={form.fields.groupId}
    onGroupChange={(v) => (form.fields.groupId = v)}
    onArchive={() => (archiveOpen = true)}
  />

  {#if save.saveError}
    <SaveError message={save.saveError} />
  {/if}

  <div class="flex flex-col gap-4 p-4 overflow-y-auto flex-1 min-h-0">
    <Description
      featureId={data.feature.id}
      value={form.fields.description}
      onChange={(v) => (form.fields.description = v)}
    />

    <Gherkin
      featureId={data.feature.id}
      value={form.fields.content}
      empty={gherkin.empty}
      parseErrors={gherkin.parsed.errors.length}
      markers={gherkin.markers}
      completionProvider={gherkin.completionProvider}
      snippets={gherkin.snippets}
      onChange={(v) => (form.fields.content = v)}
      onInsert={insertSnippet}
      bind:api={editorApi}
    />
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
