<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  import MonacoWrapper, { type EditorApi } from './MonacoWrapper.svelte';
  import ConflictModal from './ConflictModal.svelte';
  import ArchiveModal  from './ArchiveModal.svelte';
  import EditorHeader  from './EditorHeader.svelte';
  import { parse }     from '$lib/shared/gherkin/parse';
  import { buildSnippets, type Snippet } from '$lib/shared/gherkin/snippets';
  import { buildTagCompletion } from '../model/tag-completion';
  import { createSaveHandler }  from '../model/save-handler';

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

  let initialContent = $state(untrack(() => data.feature.content));
  let content        = $state(untrack(() => data.feature.content));
  let version        = $state(untrack(() => data.feature.version));
  let groupId        = $state<string>(untrack(() => data.feature.groupId ?? ''));
  let conflictOpen   = $state(false);
  let conflictWith   = $state<Feature | null>(null);
  let saving         = $state(false);
  let saveError      = $state<string | null>(null);
  let archiveOpen    = $state(false);

  let editorApi: EditorApi | null = $state(null);

  let parsed = $state(parse(untrack(() => content)));
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const snippets = $derived(buildSnippets(data.feature.name));
  const empty    = $derived(content.trim() === '');
  const dirty    = $derived(content !== initialContent);
  const markers  = $derived(
    parsed.errors.map((e) =>
      e.column === undefined
        ? { line: e.line, message: e.message }
        : { line: e.line, column: e.column, message: e.message },
    ),
  );

  function insertSnippet(snippet: Snippet): void {
    if (!editorApi) return;
    if (snippet.mode === 'replace') editorApi.setText(snippet.content);
    else                            editorApi.appendText(snippet.content);
  }

  $effect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const snapshot = content;
    debounceTimer = setTimeout(() => { parsed = parse(snapshot); }, 300);
  });

  const completionProvider = $derived(buildTagCompletion(data.projectTags, new Set(parsed.tags)));

  const onSubmit = createSaveHandler({
    onSaving:   () => { saving = true; saveError = null; },
    onFinally:  () => { saving = false; },
    onSaved:    (f) => {
      initialContent = f.content;
      content        = f.content;
      version        = f.version;
      groupId        = f.groupId ?? '';
      onSaved?.(f);
    },
    onConflict: (current) => { conflictWith = current; conflictOpen = true; },
    onError:    (msg)     => { saveError = msg; },
  });

  function reload(): void {
    conflictOpen = false;
    conflictWith = null;
    void invalidateAll().then(() => {
      initialContent = data.feature.content;
      content        = data.feature.content;
      version        = data.feature.version;
    });
  }
</script>

<form method="POST" action="?/save" use:enhance={onSubmit} class="flex flex-col min-h-0 flex-1">
  <input type="hidden" name="version" value={version} />
  <input type="hidden" name="content" value={content} />

  <EditorHeader
    featureName={data.feature.name}
    featureCode={`${data.project.codePrefix}-${data.feature.codeSeq}`}
    featureId={data.feature.id}
    {version}
    {dirty}
    parseErrors={parsed.errors.length}
    groups={data.groups}
    {snippets}
    {saving}
    {conflictOpen}
    bind:groupId
    onGroupChange={(v) => (groupId = v)}
    onInsert={insertSnippet}
    onArchive={() => (archiveOpen = true)}
  />

  {#if saveError}
    <p class="px-4 py-2 text-[12px] text-fail-ink bg-fail-soft border-b border-fail/30" role="alert">{saveError}</p>
  {/if}

  <div class="relative flex-1 min-h-0">
    <MonacoWrapper
      value={content}
      onChange={(v) => (content = v)}
      {markers}
      {completionProvider}
      bind:api={editorApi}
    />

    {#if empty}
      <div class="pointer-events-none absolute right-4 top-4 text-[11.5px] text-ink-3 italic bg-surface/85 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-border">
        Empty — use <span class="not-italic font-semibold text-ink">Insert</span> above to start
      </div>
    {/if}
  </div>
</form>

<ConflictModal
  open={conflictOpen}
  currentVersion={conflictWith?.version ?? version}
  yourVersion={version}
  editorName={'someone'}
  onReload={reload}
  onCancel={() => { conflictOpen = false; conflictWith = null; }}
/>

<ArchiveModal
  open={archiveOpen}
  featureName={data.feature.name}
  onOpenChange={(v) => (archiveOpen = v)}
/>
