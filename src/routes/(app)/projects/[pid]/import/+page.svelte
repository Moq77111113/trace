<script lang="ts">
  import { untrack } from 'svelte';
  import Button    from '$lib/components/ui/Button.svelte';
  import DropZone  from '$lib/components/ui/DropZone.svelte';
  import Select    from '$lib/components/ui/Select.svelte';
  import Pill      from '$lib/components/ui/Pill.svelte';
  import PageTitle from '$lib/components/PageTitle.svelte';
  import * as m    from '$lib/paraglide/messages';
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

<PageTitle title={`${m.page_title_import()} · ${data.project.name}`} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <section class="max-w-5xl">
    <h1 class="text-[20px] font-semibold tracking-tight mb-1">Import .feature files</h1>
    <p class="text-[13px] text-ink-3 max-w-[64ch] mb-6">
      Drop up to 100 files at once. Parse + collision check runs server-side. Nothing is written
      until you commit. Per-file commit is atomic — one bad file does not block siblings.
    </p>

    {#if ctrl.outcome}
      <div class="bg-surface border border-border rounded-xl p-4 mb-3.5">
        <p class="text-[13px] text-ink flex items-center gap-2 flex-wrap">
          <Pill kind="pass">{ctrl.outcome.imported} imported</Pill>
          <Pill kind="neutral">{ctrl.outcome.skipped} skipped</Pill>
          {#if ctrl.outcome.failed.length > 0}
            <Pill kind="fail">{ctrl.outcome.failed.length} failed</Pill>
          {/if}
        </p>
        {#if ctrl.outcome.failed.length > 0}
          <ul class="mt-3 text-[12px] text-ink-3 space-y-1">
            {#each ctrl.outcome.failed as f (f.rowId)}
              <li><span class="text-fail-ink">·</span> {f.filename} — {f.reason}</li>
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
          <p>Drop <code class="font-mono">.feature</code> files here, or click to browse</p>
          <p class="text-[11.5px] mt-1 text-ink-mute">Up to 100 files · 1 MB per file</p>
        {/if}
      </DropZone>
      {#if ctrl.error}
        <p class="mt-3 text-[12px] text-fail-ink">{ctrl.error}</p>
      {/if}
    {:else}
      <header class="flex justify-between items-center text-[12px] mb-3 gap-4 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <Pill kind="neutral">{ctrl.preview.summary.total} files</Pill>
          <Pill kind="pass">{ctrl.preview.summary.new} new</Pill>
          {#if ctrl.preview.summary.collisions > 0}
            <Pill kind="flake">{ctrl.preview.summary.collisions} collisions</Pill>
          {/if}
          {#if ctrl.preview.summary.parseErrors > 0}
            <Pill kind="fail">{ctrl.preview.summary.parseErrors} parse errors</Pill>
          {/if}
        </div>

        <div class="flex gap-3 items-center flex-wrap">
          {#if ctrl.preview.summary.collisions > 0}
            <label class="flex items-center gap-2 text-ink-3 text-[12px]">
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
            <label class="flex items-center gap-2 text-ink-3 text-[12px]">
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

      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="grid grid-cols-[32px_1.5fr_1.5fr_80px_1.2fr_140px] gap-3 px-4 py-2.5 bg-surface-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 border-b border-border">
          <div></div>
          <div>File</div>
          <div>Feature</div>
          <div class="tabular-nums">Scenarios</div>
          <div>Tags</div>
          <div>Action</div>
        </div>

        {#each ctrl.preview.rows as row (row.rowId)}
          <div class="grid grid-cols-[32px_1.5fr_1.5fr_80px_1.2fr_140px] gap-3 px-4 py-3 text-[13px] border-t border-border items-center {statusRowClass(row.status)}">
            <div class="font-mono text-[14px] {statusTextClass(row.status)}">{statusSymbol(row.status)}</div>
            <div class="text-ink truncate font-mono text-[12.5px]">{row.filename}</div>
            <div class="truncate">
              <span class="text-ink font-medium">{row.featureName ?? '—'}</span>
              {#if row.status === 'collision' && row.collidesWithId}
                <span class="text-[10.5px] text-flake-ink ml-1">· exists</span>
              {:else if row.status === 'collision'}
                <span class="text-[10.5px] text-flake-ink ml-1">· duplicate in batch</span>
              {:else if row.status === 'parse-error'}
                <span class="text-[10.5px] text-fail-ink ml-1">· {row.parseErrors.length} parse error{row.parseErrors.length === 1 ? '' : 's'}</span>
              {/if}
              {#if row.groupName}
                <div class="text-[10.5px] text-ink-mute mt-0.5">
                  Group: <span class="text-ink-3">{row.groupName}</span>
                </div>
              {/if}
            </div>
            <div class="text-ink-3 tabular-nums">{row.status === 'parse-error' ? '—' : row.scenarioCount}</div>
            <div class="text-[11px] font-mono text-ink-3 truncate">
              {row.tags.length ? row.tags.map((t) => `@${t}`).join(' ') : '—'}
            </div>
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

      <footer class="mt-4 flex justify-between items-center gap-3 flex-wrap">
        <span class="text-[12px] text-ink-mute">Per-file commit, atomic per row. Errors don't block others.</span>
        <div class="flex gap-2">
          <Button variant="ghost" onclick={() => ctrl.reset()}>Cancel</Button>
          <Button onclick={() => ctrl.commit()} disabled={ctrl.committing} variant="primary">
            Import {ctrl.preview.summary.total} file{ctrl.preview.summary.total === 1 ? '' : 's'}
          </Button>
        </div>
      </footer>

      {#if ctrl.error}
        <p class="mt-3 text-[12px] text-fail-ink">{ctrl.error}</p>
      {/if}
    {/if}
  </section>
</div>
