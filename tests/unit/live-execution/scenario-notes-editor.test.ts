import { describe, it, expect, vi } from 'vitest';
import { ScenarioNotesEditor } from '$lib/features/live-execution/model/notes-editor.svelte';
import type { ExecutionApi } from '$lib/features/live-execution/api/client';
import type { ScenarioSelection } from '$lib/features/live-execution/model/selection.svelte';

function fakeApi(overrides: Partial<ExecutionApi> = {}): ExecutionApi {
  return {
    patchScenarioStatus:      vi.fn().mockResolvedValue(undefined),
    patchScenarioNotes:       vi.fn().mockResolvedValue(undefined),
    postAbort:                vi.fn().mockResolvedValue(undefined),
    uploadScenarioAttachment: vi.fn(),
    ...overrides,
  } as ExecutionApi;
}

function fakeSelection(initialId: string): ScenarioSelection {
  const sel = { selectedId: initialId };
  return sel as unknown as ScenarioSelection;
}

describe('ScenarioNotesEditor', () => {
  it('seeds the draft from the initial map for the selected scenario', () => {
    const sel    = fakeSelection('s1');
    const editor = new ScenarioNotesEditor(
      fakeApi(),
      sel,
      new Map([['s1', 'pre-existing'], ['s2', null]]),
    );

    expect(editor.draft).toBe('pre-existing');
    expect(editor.status).toBe('idle');
  });

  it('switches the visible draft when selection changes', () => {
    const sel    = fakeSelection('s1');
    const editor = new ScenarioNotesEditor(
      fakeApi(),
      sel,
      new Map([['s1', 'first note'], ['s2', 'second note']]),
    );

    expect(editor.draft).toBe('first note');

    sel.selectedId = 's2';
    expect(editor.draft).toBe('second note');

    sel.selectedId = 's1';
    expect(editor.draft).toBe('first note');
  });

  it('flushes the current draft to the currently selected scenario', async () => {
    const sel    = fakeSelection('s1');
    const api    = fakeApi();
    const editor = new ScenarioNotesEditor(api, sel, new Map([['s1', null]]));

    editor.draft = 'a new note';
    await editor.flush();

    expect(api.patchScenarioNotes).toHaveBeenCalledWith('s1', 'a new note');
    expect(editor.status).toBe('saved');
  });

  it('normalises blank drafts to null on flush', async () => {
    const sel    = fakeSelection('s1');
    const api    = fakeApi();
    const editor = new ScenarioNotesEditor(api, sel, new Map([['s1', 'old']]));

    editor.draft = '   ';
    await editor.flush();

    expect(api.patchScenarioNotes).toHaveBeenCalledWith('s1', null);
  });

  it('captures save failure on status and lastError', async () => {
    const sel    = fakeSelection('s1');
    const api    = fakeApi({
      patchScenarioNotes: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const editor = new ScenarioNotesEditor(api, sel, new Map([['s1', null]]));

    editor.draft = 'try this';
    await editor.flush();

    expect(editor.status).toBe('error');
    expect(editor.lastError).toBe('boom');
  });
});
