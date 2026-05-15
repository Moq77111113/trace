<script lang="ts">
  import { untrack } from 'svelte';
  import Button   from '$lib/components/ui/Button.svelte';
  import DropZone from '$lib/components/ui/DropZone.svelte';
  import Select   from '$lib/components/ui/Select.svelte';
  import { createImportApi }          from '$lib/import/api';
  import { ImportPreviewController } from '$lib/import/preview.svelte';
  import {
    decisionOptionsFor,
    statusRowClass,
    statusSymbol,
    statusTextClass,
    type Decision,
  } from '$lib/import/format';

  let { data } = $props();

  const ctrl = untrack(() => new ImportPreviewController(createImportApi(data.project.id)));

  const bulkCollisionOptions: { value: Decision; label: string }[] = [
    { value: 'skip',      label: 'Skip all'      },
    { value: 'overwrite', label: 'Overwrite all' },
    { value: 'rename',    label: 'Rename all'    },
  ];

  const bulkParseErrorOptions: { value: Decision; label: string }[] = [
    { value: 'skip',   label: 'Skip all'                  },
    { value: 'import', label: 'Import all (non-runnable)' },
  ];
</script>

<section class="max-w-5xl">
  <h2 class="text-lg font-semibold mb-1">Import .feature files</h2>
  <p class="text-sm text-surface-400 mb-6">
    Drop up to 100 files at once. Parse + collision check runs server-side. Nothing is written
    until you commit. Per-file commit is atomic — one bad file does not block siblings.
  </p>

  {#if ctrl.outcome}
    <div class="rounded-md border border-surface-700 bg-surface-800 p-5 mb-4">
      <p class="text-sm text-surface-200">
        <strong class="text-state-passed">{ctrl.outcome.imported}</strong> imported ·
        <strong class="text-surface-300">{ctrl.outcome.skipped}</strong> skipped ·
        <strong class="text-state-failed">{ctrl.outcome.failed.length}</strong> failed
      </p>
      {#if ctrl.outcome.failed.length > 0}
        <ul class="mt-3 text-xs text-surface-400 space-y-1">
          {#each ctrl.outcome.failed as f (f.rowId)}
            <li><span class="text-state-failed">·</span> {f.filename} — {f.reason}</li>
          {/each}
        </ul>
      {/if}
    </div>
    <Button variant="secondary" onclick={() => ctrl.reset()}>Import more files</Button>
  {:else if !ctrl.preview}
    <DropZone accept=".feature" multiple onDrop={(files) => ctrl.upload(files)}>
      {#if ctrl.uploading}
        Parsing files…
      {:else}
        <p>Drop <code>.feature</code> files here, or click to browse</p>
        <p class="text-xs mt-1 text-surface-500">Up to 100 files · 1 MB per file</p>
      {/if}
    </DropZone>
    {#if ctrl.error}
      <p class="mt-3 text-xs text-state-failed">{ctrl.error}</p>
    {/if}
  {:else}
    <header class="flex justify-between items-center text-xs mb-3 gap-4">
      <div class="text-surface-400">
        <strong class="text-surface-100">{ctrl.preview.summary.total}</strong> files ·
        <strong class="text-state-passed">{ctrl.preview.summary.new}</strong> new ·
        <strong class="text-state-running">{ctrl.preview.summary.collisions}</strong> collisions ·
        <strong class="text-state-failed">{ctrl.preview.summary.parseErrors}</strong> parse errors
      </div>

      <div class="flex gap-4 items-center">
        {#if ctrl.preview.summary.collisions > 0}
          <label class="flex items-center gap-2 text-surface-400">
            <span>Apply to collisions:</span>
            <Select
              value=""
              onValueChange={(v) => ctrl.applyBulkToStatus('collision', v as Decision)}
              options={bulkCollisionOptions}
              placeholder="Bulk…"
            />
          </label>
        {/if}

        {#if ctrl.preview.summary.parseErrors > 0}
          <label class="flex items-center gap-2 text-surface-400">
            <span>Apply to parse errors:</span>
            <Select
              value=""
              onValueChange={(v) => ctrl.applyBulkToStatus('parse-error', v as Decision)}
              options={bulkParseErrorOptions}
              placeholder="Bulk…"
            />
          </label>
        {/if}
      </div>
    </header>

    <div class="rounded-md border border-surface-700 bg-surface-800 overflow-hidden">
      <div class="grid grid-cols-[32px_1.5fr_1.5fr_80px_1.2fr_140px] gap-3 px-4 py-2 bg-surface-700/40 text-[10px] uppercase tracking-wider text-surface-400 border-b border-surface-700">
        <div></div>
        <div>File</div>
        <div>Feature</div>
        <div>Scenarios</div>
        <div>Tags</div>
        <div>Action</div>
      </div>

      {#each ctrl.preview.rows as row (row.rowId)}
        <div class="grid grid-cols-[32px_1.5fr_1.5fr_80px_1.2fr_140px] gap-3 px-4 py-3 text-sm border-b border-surface-700/60 items-center {statusRowClass(row.status)}">
          <div class={statusTextClass(row.status)}>{statusSymbol(row.status)}</div>
          <div class="text-surface-200 truncate">{row.filename}</div>
          <div class="truncate">
            <span class="text-surface-100">{row.featureName ?? '—'}</span>
            {#if row.status === 'collision' && row.collidesWithId}
              <span class="text-[10px] text-state-running ml-1">· exists</span>
            {:else if row.status === 'collision'}
              <span class="text-[10px] text-state-running ml-1">· duplicate in batch</span>
            {:else if row.status === 'parse-error'}
              <span class="text-[10px] text-state-failed ml-1">· {row.parseErrors.length} parse error{row.parseErrors.length === 1 ? '' : 's'}</span>
            {/if}
            {#if row.groupName}
              <div class="text-[10px] text-surface-500 mt-0.5">Group: <span class="text-surface-300">{row.groupName}</span></div>
            {/if}
          </div>
          <div class="text-surface-400">{row.status === 'parse-error' ? '—' : row.scenarioCount}</div>
          <div class="text-xs text-state-running truncate">{row.tags.length ? row.tags.map((t) => `@${t}`).join(' ') : '—'}</div>
          <div>
            <Select
              value={ctrl.actions[row.rowId] ?? 'skip'}
              onValueChange={(v) => ctrl.setAction(row.rowId, v as Decision)}
              options={decisionOptionsFor(row.status)}
            />
          </div>
        </div>
      {/each}
    </div>

    <footer class="mt-4 flex justify-between items-center">
      <span class="text-xs text-surface-500">Per-file commit, atomic per row. Errors don't block others.</span>
      <div class="flex gap-2">
        <Button variant="secondary" onclick={() => ctrl.reset()}>Cancel</Button>
        <Button onclick={() => ctrl.commit()} loading={ctrl.committing} variant="primary">
          Import {ctrl.preview.summary.total} file{ctrl.preview.summary.total === 1 ? '' : 's'}
        </Button>
      </div>
    </footer>

    {#if ctrl.error}
      <p class="mt-3 text-xs text-state-failed">{ctrl.error}</p>
    {/if}
  {/if}
</section>
