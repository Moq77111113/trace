import { SvelteMap } from 'svelte/reactivity';
import type { ExecutionApi }      from '../api/client';
import type { ScenarioSelection } from './selection.svelte';

export type NotesSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Live-execution scenario notes editor. Draft and save status always reflect
 * the currently selected scenario - the editor reads selection at call time
 * so no caller can write a note to the wrong scenario from the UI.
 */
export class ScenarioNotesEditor {
  private readonly seed:    Map<string, string | null>;
  private readonly drafts:  SvelteMap<string, string>          = new SvelteMap();
  private readonly states:  SvelteMap<string, NotesSaveStatus> = new SvelteMap();
  private readonly errors:  SvelteMap<string, string | null>   = new SvelteMap();

  constructor(
    private readonly api:       ExecutionApi,
    private readonly selection: ScenarioSelection,
    initial: ReadonlyMap<string, string | null>,
  ) {
    this.seed = new Map(initial);
  }

  get draft(): string {
    const id = this.selection.selectedId;
    if (!id) return '';
    return this.drafts.get(id) ?? this.seed.get(id) ?? '';
  }

  set draft(value: string) {
    const id = this.selection.selectedId;
    if (!id) return;
    this.drafts.set(id, value);
  }

  get status(): NotesSaveStatus {
    const id = this.selection.selectedId;
    return id ? (this.states.get(id) ?? 'idle') : 'idle';
  }

  set status(value: NotesSaveStatus) {
    const id = this.selection.selectedId;
    if (id) this.states.set(id, value);
  }

  get lastError(): string | null {
    const id = this.selection.selectedId;
    return id ? (this.errors.get(id) ?? null) : null;
  }

  flush = async (): Promise<void> => {
    const id = this.selection.selectedId;
    if (!id) return;

    const raw   = this.drafts.get(id) ?? this.seed.get(id) ?? '';
    const value = raw.trim().length === 0 ? null : raw;

    this.states.set(id, 'saving');
    this.errors.delete(id);

    try {
      await this.api.patchScenarioNotes(id, value);
      this.seed.set(id, value);
      this.drafts.set(id, value ?? '');
      this.states.set(id, 'saved');
    } catch (e) {
      this.states.set(id, 'error');
      this.errors.set(id, e instanceof Error ? e.message : 'Notes not saved');
    }
  };
}
