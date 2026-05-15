<script lang="ts">
  import { untrack } from 'svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DropZone from '$lib/components/ui/DropZone.svelte';
  import Kbd from '$lib/components/ui/Kbd.svelte';
  import Modal    from '$lib/components/ui/Modal.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import type { RunPageData } from '$lib/server/runs/queries';

  type Props = { data: NonNullable<RunPageData> };

  type Scenario = Props['data']['scenarios'][number];
  type Verdict  = 'PASSED' | 'FAILED' | 'SKIPPED';

  type BadgeVariant = 'passed' | 'failed' | 'skipped' | 'neutral';

  function badgeVariant(status: Scenario['status']): BadgeVariant {
    if (status === 'PASSED')  return 'passed';
    if (status === 'FAILED')  return 'failed';
    if (status === 'SKIPPED') return 'skipped';
    return 'neutral';
  }

  function iconFor(status: Scenario['status']): string {
    if (status === 'PASSED')  return '✓';
    if (status === 'FAILED')  return '✗';
    if (status === 'SKIPPED') return '↷';
    return '○';
  }

  function formatDuration(ms: number | null): string {
    if (ms === null || ms === undefined) return '';
    return `${(ms / 1000).toFixed(1)}s`;
  }

  let { data }: Props = $props();

  let scenarios = $state<Scenario[]>(untrack(() => data.scenarios));

  function firstPendingId(rows: Scenario[]): string {
    const pending = rows.find((s) => s.status === 'PENDING');
    if (pending) return pending.id;
    const first = rows[0];
    return first ? first.id : '';
  }

  let selectedId = $state(untrack(() => firstPendingId(scenarios)));

  const selected = $derived(scenarios.find((s) => s.id === selectedId));

  const counts = $derived({
    total: scenarios.length,
    done:  scenarios.filter((s) => s.status !== 'PENDING').length,
  });

  let saveError = $state<string | null>(null);

  function pickNextPending(currentId: string): string {
    const idx = scenarios.findIndex((s) => s.id === currentId);
    if (idx < 0) return currentId;

    for (let i = 1; i <= scenarios.length; i++) {
      const next = scenarios[(idx + i) % scenarios.length];
      if (next && next.status === 'PENDING') return next.id;
    }

    return currentId;
  }

  function patchScenario(scenarioId: string, status: Verdict, prev: Scenario['status']): void {
    void (async () => {
      const res = await fetch(`/api/runs/${data.run.id}/scenarios/${scenarioId}`, {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ status }),
      });

      if (res.ok) return;

      scenarios = scenarios.map((s) => (s.id === scenarioId ? { ...s, status: prev } : s));

      const body = await res.json().catch(() => null);
      const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : `Save failed (${res.status})`;
      saveError = message;
    })();
  }

  function mark(status: Verdict): void {
    if (!selected) return;

    const target = selected;
    const prev   = target.status;

    saveError = null;
    scenarios = scenarios.map((s) => (s.id === target.id ? { ...s, status } : s));

    patchScenario(target.id, status, prev);

    if (status !== 'FAILED') selectedId = pickNextPending(target.id);
  }

  function moveSelection(delta: -1 | 1): void {
    const idx = scenarios.findIndex((s) => s.id === selectedId);
    if (idx < 0) return;

    const len = scenarios.length;
    if (len === 0) return;

    const next = scenarios[(idx + delta + len) % len];
    if (!next) return;

    selectedId = next.id;
  }

  function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;

    return target.isContentEditable;
  }

  let finishForm: HTMLFormElement | undefined = $state();

  $effect(() => {
    function onKey(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        finishForm?.requestSubmit();
        return;
      }

      // Letter shortcuts only fire without modifier keys (so Ctrl+P still prints).
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === 'p') { mark('PASSED');  return; }
      if (key === 'f') { mark('FAILED');  return; }
      if (key === 's') { mark('SKIPPED'); return; }

      if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1);  return; }
      if (event.key === 'ArrowUp')   { event.preventDefault(); moveSelection(-1); return; }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  type Attachment = {
    id:        string;
    filename:  string;
    sizeBytes: number;
    mimeType:  string;
  };

  function isAttachment(v: unknown): v is Attachment {
    return !!v
      && typeof v === 'object'
      && 'id'        in v && typeof v.id        === 'string'
      && 'filename'  in v && typeof v.filename  === 'string'
      && 'sizeBytes' in v && typeof v.sizeBytes === 'number'
      && 'mimeType'  in v && typeof v.mimeType  === 'string';
  }

  let uploadsByScenario = $state<Record<string, Attachment[]>>({});
  let uploading         = $state(false);
  let uploadError       = $state<string | null>(null);

  let notes        = $state(untrack(() => data.run.notes ?? ''));
  let notesError   = $state<string | null>(null);
  let confirming   = $state(false);

  const pendingCount = $derived(scenarios.filter((s) => s.status === 'PENDING').length);

  async function saveNotesToServer(): Promise<void> {
    notesError = null;

    const res = await fetch(`/api/runs/${data.run.id}/notes`, {
      method:  'PATCH',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ notes }),
    });

    if (res.ok) return;

    const body    = await res.json().catch(() => null);
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : `Notes not saved (${res.status})`;
    notesError = message;
  }

  function requestFinish(): void {
    if (pendingCount > 0) {
      confirming = true;
      return;
    }
    finishForm?.requestSubmit();
  }

  function confirmFinish(): void {
    confirming = false;
    finishForm?.requestSubmit();
  }

  async function uploadOne(file: File): Promise<void> {
    if (!selected) return;
    const target = selected;

    const form = new FormData();
    form.set('file', file);

    const res = await fetch(`/api/runs/${data.run.id}/scenarios/${target.id}/attachments`, {
      method: 'POST',
      body:   form,
    });

    if (!res.ok) {
      const body    = await res.json().catch(() => null);
      const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : `Upload failed for ${file.name} (${res.status})`;
      uploadError = message;
      return;
    }

    const row = await res.json();
    if (!isAttachment(row)) return;

    const existing = uploadsByScenario[target.id] ?? [];
    uploadsByScenario = { ...uploadsByScenario, [target.id]: [...existing, row] };
  }

  async function handleDropFiles(files: File[]): Promise<void> {
    uploading   = true;
    uploadError = null;

    for (const file of files) {
      await uploadOne(file);
    }

    uploading = false;
  }
</script>

<header class="flex justify-between items-center mb-4">
  <div class="flex items-center gap-3">
    <h2 class="text-lg font-semibold">{data.feature.name}</h2>
    <Badge variant="neutral">RUNNING</Badge>
  </div>
  <Button onclick={requestFinish}>Finish run <Kbd>⌘↵</Kbd></Button>
</header>

<section class="grid grid-cols-[40%_1fr] min-h-[440px] border border-surface-700 rounded-md overflow-hidden bg-surface-900">
  <aside class="border-r border-surface-700">
    <header class="px-4 py-3 text-xs uppercase text-surface-400 tracking-wide border-b border-surface-700">
      Scenarios · {counts.done}/{counts.total}
    </header>

    <ul>
      {#each scenarios as scenario (scenario.id)}
        <li>
          <button
            type="button"
            class="w-full flex justify-between items-center px-4 py-2 text-sm border-b border-surface-700 text-left hover:bg-surface-800 transition"
            class:bg-surface-800={scenario.id === selectedId}
            onclick={() => { selectedId = scenario.id; }}
          >
            <span class="flex items-center gap-2">
              <span class="text-surface-400">{iconFor(scenario.status)}</span>
              <span>{scenario.scenarioName}</span>
            </span>
            <span class="text-xs text-surface-400">{formatDuration(scenario.durationMs)}</span>
          </button>
        </li>
      {/each}
    </ul>

    <footer class="px-4 py-3 text-xs text-surface-400">
      <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate · <Kbd>P</Kbd> pass · <Kbd>F</Kbd> fail · <Kbd>S</Kbd> skip
    </footer>
  </aside>

  <article class="p-6">
    {#if selected}
      <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Active scenario</div>
      <h3 class="text-base font-semibold mb-4">Scenario: {selected.scenarioName}</h3>

      <div class="mb-4">
        <Badge variant={badgeVariant(selected.status)}>{selected.status}</Badge>
      </div>

      {#if saveError}
        <p class="mb-3 text-xs text-state-failed" role="alert">{saveError}</p>
      {/if}

      <div class="flex gap-2">
        <Button variant="primary"   onclick={() => mark('PASSED')}>✓ Pass <Kbd>P</Kbd></Button>
        <Button variant="danger"    onclick={() => mark('FAILED')}>✗ Fail <Kbd>F</Kbd></Button>
        <Button variant="secondary" onclick={() => mark('SKIPPED')}>↷ Skip <Kbd>S</Kbd></Button>
      </div>

      {#if selected && selected.status === 'FAILED'}
        <div class="mt-4">
          <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Attachments</div>

          <DropZone onDrop={handleDropFiles}>
            📎 Drop screenshots, logs, or files here · or click to browse
            {#if uploading}<span class="block mt-1 text-xs">Uploading…</span>{/if}
          </DropZone>

          {#if uploadError}
            <p class="mt-2 text-xs text-state-failed" role="alert">{uploadError}</p>
          {/if}

          {#if (uploadsByScenario[selected.id] ?? []).length > 0}
            <ul class="mt-3 space-y-1 text-sm">
              {#each uploadsByScenario[selected.id] ?? [] as attachment (attachment.id)}
                <li class="px-3 py-1.5 bg-surface-800 border border-surface-700 rounded flex justify-between items-center">
                  <span>📎 {attachment.filename}</span>
                  <span class="text-xs text-surface-400">{(attachment.sizeBytes / 1024).toFixed(1)} KB</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}

      <div class="mt-6">
        <div class="text-xs uppercase tracking-wide text-surface-400 mb-1">Notes</div>
        <Textarea
          rows={3}
          bind:value={notes}
          onblur={saveNotesToServer}
          placeholder="Observations, repro steps, browser info…"
        />
        {#if notesError}
          <p class="mt-1 text-xs text-state-failed" role="alert">{notesError}</p>
        {/if}
      </div>
    {/if}
  </article>
</section>

<form bind:this={finishForm} method="POST" action="?/finish" class="hidden"></form>

<Modal
  open={confirming}
  onOpenChange={(v) => { if (!v) confirming = false; }}
  title="Finish run with pending scenarios?"
>
  <p class="text-sm">
    <strong class="text-surface-100">{pendingCount}</strong> scenario{pendingCount === 1 ? '' : 's'} still pending.
    They will be marked <strong class="text-surface-100">SKIPPED</strong>.
  </p>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => { confirming = false; }}>Cancel</Button>
    <Button onclick={confirmFinish}>Confirm finish</Button>
  {/snippet}
</Modal>
