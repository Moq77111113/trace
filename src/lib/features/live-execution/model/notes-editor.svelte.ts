import type { ExecutionApi } from '../api/client';

export class NotesEditor {
  notes:      string        = $state('');
  notesError: string | null = $state(null);

  constructor(private readonly api: ExecutionApi, initial: string) {
    this.notes = initial;
  }

  flush = async (): Promise<void> => {
    this.notesError = null;
    try {
      await this.api.patchNotes(this.notes);
    } catch (e) {
      this.notesError = e instanceof Error ? e.message : 'Notes not saved';
    }
  };
}
