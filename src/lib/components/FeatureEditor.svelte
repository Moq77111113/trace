<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { DropdownMenu } from 'bits-ui';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type * as Monaco from 'monaco-editor';

  import MonacoWrapper, { type EditorApi } from './MonacoWrapper.svelte';
  import ConflictModal  from './ConflictModal.svelte';
  import DirtyIndicator from './DirtyIndicator.svelte';
  import ErrorBadge     from './ErrorBadge.svelte';
  import Button         from '$lib/components/ui/Button.svelte';
  import Icon           from '$lib/components/ui/Icon.svelte';
  import Modal          from '$lib/components/ui/Modal.svelte';
  import { parse }      from '$lib/gherkin/parse';
  import { buildSnippets, type Snippet } from '$lib/gherkin/snippets';

  type ParseErrors = { line: number; column?: number; message: string }[] | null;

  type Feature = {
    id:          string;
    name:        string;
    content:     string;
    version:     number;
    parseErrors: ParseErrors;
    groupId:     string | null;
  };

  type ProjectTag = { name: string; count: number };

  type Group = { id: string; name: string };

  type Props = {
    data: { feature: Feature; projectTags: ProjectTag[]; groups: Group[] };
    onSaved?: (feature: Feature) => void;
  };

  type SaveSuccess = { feature: Feature };
  type SaveFailure = { error?: string; conflict?: boolean; currentFeature?: Feature };

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
  let archiving      = $state(false);
  let archiveForm    = $state<HTMLFormElement | undefined>();

  function confirmArchive(): void {
    if (!archiveForm) return;
    archiving = true;
    archiveForm.requestSubmit();
  }

  let editorApi = $state<EditorApi | null>(null);

  let parsed = $state(parse(untrack(() => content)));
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const snippets = $derived(buildSnippets(data.feature.name));
  const empty    = $derived(content.trim() === '');

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

  const dirty   = $derived(content !== initialContent);
  const markers = $derived(
    parsed.errors.map((e) =>
      e.column === undefined
        ? { line: e.line, message: e.message }
        : { line: e.line, column: e.column, message: e.message },
    ),
  );

  function buildCompletion(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): Monaco.languages.CompletionList {
    const word  = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      startColumn:     word.startColumn,
      endLineNumber:   position.lineNumber,
      endColumn:       word.endColumn,
    };

    const lineBefore = model.getValueInRange({ ...range, startColumn: 1 });
    if (!lineBefore.includes('@')) return { suggestions: [] };

    const existing = new Set(parsed.tags);

    const suggestions = data.projectTags.map((t) => ({
      label:      `@${t.name}`,
      kind:       17,
      insertText: t.name,
      detail:     `${t.count} feature${t.count === 1 ? '' : 's'}`,
      range,
      sortText:   existing.has(t.name)
        ? `b-${t.name}`
        : `a-${String(1_000_000 - t.count).padStart(7, '0')}`,
    }));

    return { suggestions };
  }

  function onMonacoChange(v: string): void {
    content = v;
  }

  const onSubmit: SubmitFunction<SaveSuccess, SaveFailure> = () => {
    saving    = true;
    saveError = null;

    return async ({ result }) => {
      saving = false;

      if (result.type === 'success' && result.data?.feature) {
        const saved = result.data.feature;
        initialContent = saved.content;
        content        = saved.content;
        version        = saved.version;
        groupId        = saved.groupId ?? '';
        onSaved?.(saved);
        return;
      }

      if (result.type === 'failure' && result.data?.conflict && result.data.currentFeature) {
        conflictWith = result.data.currentFeature;
        conflictOpen = true;
        return;
      }

      if (result.type === 'failure' && result.data?.error) {
        saveError = result.data.error;
        return;
      }

      if (result.type === 'error') {
        saveError = result.error.message;
      }
    };
  };

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

<form method="POST" action="?/save" use:enhance={onSubmit}>
  <input type="hidden" name="version" value={version} />
  <input type="hidden" name="content" value={content} />

  <header class="flex items-center gap-3 mb-3">
    <h2 class="text-base font-semibold">
      {data.feature.name} <DirtyIndicator {dirty} />
    </h2>
    <ErrorBadge count={parsed.errors.length} />
    <div class="ml-auto flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger class="inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md bg-surface-700 text-surface-100 hover:bg-surface-600 border border-surface-600 transition">
          Insert <Icon name="ChevronDown" size={14} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={4}
            align="end"
            class="min-w-[180px] bg-surface-800 border border-surface-600 rounded-md shadow-xl py-1 z-50"
          >
            {#each snippets as snippet (snippet.key)}
              <DropdownMenu.Item
                class="px-3 py-1.5 text-sm text-surface-100 hover:bg-surface-700 focus:bg-surface-700 outline-none cursor-pointer"
                onSelect={() => insertSnippet(snippet)}
              >
                {snippet.label}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <label class="flex items-center gap-2 text-xs">
        <span class="text-surface-400">Group:</span>
        <select name="groupId" bind:value={groupId} class="bg-surface-700 border border-surface-600 rounded px-2 py-1 text-xs text-surface-100">
          <option value="">Ungrouped</option>
          {#each data.groups as g (g.id)}
            <option value={g.id}>{g.name}</option>
          {/each}
        </select>
      </label>
      <a
        href={`/api/features/${data.feature.id}/export`}
        class="text-xs text-surface-400 underline-offset-2 hover:underline hover:text-surface-200"
      >
        Download .feature
      </a>
      <span class="text-xs text-surface-400">v{version}</span>
      <Button type="button" variant="ghost" size="sm" onclick={() => (archiveOpen = true)}>Archive</Button>
      <Button type="submit" loading={saving} disabled={!dirty || conflictOpen}>Save</Button>
    </div>
  </header>

  {#if saveError}
    <p class="mb-3 text-xs text-state-failed" role="alert">{saveError}</p>
  {/if}

  <div class="relative">
    <MonacoWrapper
      value={content}
      onChange={onMonacoChange}
      markers={markers}
      completionProvider={buildCompletion}
      bind:api={editorApi}
    />

    {#if empty}
      <div class="pointer-events-none absolute right-4 top-4 text-xs text-surface-400 italic bg-surface-800/85 px-2.5 py-1.5 rounded-md border border-surface-700">
        Empty — use <span class="not-italic font-semibold text-surface-100">Insert</span> above to start
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

<form bind:this={archiveForm} method="POST" action="?/archive" use:enhance></form>

<Modal
  open={archiveOpen}
  onOpenChange={(v) => (archiveOpen = v)}
  title="Archive feature"
>
  <p>Archive <strong>{data.feature.name}</strong>?</p>
  <p class="text-xs text-surface-400 mt-2">
    It will be hidden from this project. Existing run history is preserved.
  </p>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (archiveOpen = false)}>Cancel</Button>
    <Button variant="danger" loading={archiving} onclick={confirmArchive}>Archive</Button>
  {/snippet}
</Modal>
