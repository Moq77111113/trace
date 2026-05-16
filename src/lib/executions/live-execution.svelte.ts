import type { ExecutionPageData } from '$lib/server/executions/queries';
import { createExecutionApi, type ExecutionApi, type UploadedAttachment, type Verdict } from './api';

type RunData    = NonNullable<ExecutionPageData>;
type Scenario   = RunData['scenarios'][number];
type Attachment = UploadedAttachment;

export type ScenarioFilter = 'all' | 'failed' | 'pending';

/**
 * Owns the live-run UI state and the side-effects that flow from user actions.
 * The component renders this controller's fields and dispatches verbs —
 * no inline fetches, no inline status mapping.
 */
export class LiveExecutionController {
  scenarios:         Scenario[]                        = $state([]);
  selectedId:        string                            = $state('');
  notes:             string                            = $state('');
  saveError:         string | null                     = $state(null);
  notesError:        string | null                     = $state(null);
  uploadError:       string | null                     = $state(null);
  abortError:        string | null                     = $state(null);
  uploadsByScenario: Record<string, Attachment[]>      = $state({});
  uploading:         boolean                           = $state(false);
  confirming:        boolean                           = $state(false);
  confirmingAbort:   boolean                           = $state(false);
  aborting:          boolean                           = $state(false);
  filter:            ScenarioFilter                    = $state('all');

  readonly executionId:    string;
  readonly counts        = $derived({
    total: this.scenarios.length,
    done:  this.scenarios.filter((s) => s.status !== 'PENDING').length,
  });
  readonly pendingCount  = $derived(this.scenarios.filter((s) => s.status === 'PENDING').length);
  readonly failedCount   = $derived(this.scenarios.filter((s) => s.status === 'FAILED').length);
  readonly selected      = $derived<Scenario | undefined>(this.scenarios.find((s) => s.id === this.selectedId));
  readonly attachmentsOfSelected = $derived<Attachment[]>(this.selected ? this.uploadsByScenario[this.selected.id] ?? [] : []);
  readonly visibleScenarios = $derived<Scenario[]>(this.scenarios.filter((s) => this.matchesFilter(s)));

  private readonly api: ExecutionApi;

  constructor(data: RunData, api: ExecutionApi = createExecutionApi(data.execution.id)) {
    this.executionId      = data.execution.id;
    this.scenarios  = data.scenarios.slice();
    this.notes      = data.execution.notes ?? '';
    this.selectedId = this.firstPendingId();
    this.api        = api;
  }

  selectScenario = (id: string): void => {
    this.selectedId = id;
  };

  moveDown = (): void => this.moveSelection(1);
  moveUp   = (): void => this.moveSelection(-1);

  markPassed  = (): void => this.mark('PASSED');
  markFailed  = (): void => this.mark('FAILED');
  markSkipped = (): void => this.mark('SKIPPED');

  jumpToNextPending = (): void => {
    const next = this.pickNextPending(this.selectedId);
    if (next) this.selectedId = next;
  };

  setFilter = (filter: ScenarioFilter): void => {
    this.filter = filter;
  };

  /** Returns `true` if the run can be finished right now; `false` if a confirm is required (and opens it). */
  requestFinish = (): boolean => {
    if (this.pendingCount === 0) return true;
    this.confirming = true;
    return false;
  };

  cancelConfirmFinish = (): void => {
    this.confirming = false;
  };

  requestAbort = (): void => {
    this.abortError      = null;
    this.confirmingAbort = true;
  };

  cancelConfirmAbort = (): void => {
    this.confirmingAbort = false;
  };

  abort = async (): Promise<{ ok: boolean }> => {
    this.aborting   = true;
    this.abortError = null;
    try {
      await this.api.postAbort();
      this.scenarios = this.scenarios.map((s) => (s.status === 'PENDING' ? { ...s, status: 'SKIPPED' } : s));
      this.confirmingAbort = false;
      return { ok: true };
    } catch (e) {
      this.abortError = e instanceof Error ? e.message : 'Abort failed';
      return { ok: false };
    } finally {
      this.aborting = false;
    }
  };

  flushNotes = async (): Promise<void> => {
    this.notesError = null;
    try {
      await this.api.patchNotes(this.notes);
    } catch (e) {
      this.notesError = e instanceof Error ? e.message : 'Notes not saved';
    }
  };

  uploadFiles = async (files: File[]): Promise<void> => {
    const target = this.selected;
    if (!target) return;

    this.uploading   = true;
    this.uploadError = null;

    try {
      for (const file of files) {
        try {
          const row = await this.api.uploadScenarioAttachment(target.id, file);
          const existing = this.uploadsByScenario[target.id] ?? [];
          this.uploadsByScenario = { ...this.uploadsByScenario, [target.id]: [...existing, row] };
        } catch (e) {
          this.uploadError = e instanceof Error ? e.message : `Upload failed for ${file.name}`;
        }
      }
    } finally {
      this.uploading = false;
    }
  };

  private mark(status: Verdict): void {
    const target = this.selected;
    if (!target) return;

    const previous = target.status;

    this.saveError = null;
    this.scenarios = this.scenarios.map((s) => (s.id === target.id ? { ...s, status } : s));

    void this.patchScenarioWithRollback(target.id, status, previous);

    if (status !== 'FAILED') this.selectedId = this.pickNextPending(target.id);
  }

  private async patchScenarioWithRollback(scenarioId: string, status: Verdict, previous: Scenario['status']): Promise<void> {
    try {
      await this.api.patchScenarioStatus(scenarioId, status);
    } catch (e) {
      this.scenarios = this.scenarios.map((s) => (s.id === scenarioId ? { ...s, status: previous } : s));
      this.saveError = e instanceof Error ? e.message : 'Save failed';
    }
  }

  private moveSelection(delta: -1 | 1): void {
    const list = this.visibleScenarios;
    const len  = list.length;
    if (len === 0) return;

    const idx = list.findIndex((s) => s.id === this.selectedId);
    if (idx < 0) {
      this.selectedId = list[0]?.id ?? '';
      return;
    }

    const next = list[(idx + delta + len) % len];
    if (!next) return;

    this.selectedId = next.id;
  }

  private matchesFilter(scenario: Scenario): boolean {
    if (this.filter === 'failed')  return scenario.status === 'FAILED';
    if (this.filter === 'pending') return scenario.status === 'PENDING';
    return true;
  }

  private firstPendingId(): string {
    const pending = this.scenarios.find((s) => s.status === 'PENDING');
    if (pending) return pending.id;
    return this.scenarios[0]?.id ?? '';
  }

  private pickNextPending(currentId: string): string {
    const idx = this.scenarios.findIndex((s) => s.id === currentId);
    if (idx < 0) return currentId;

    for (let i = 1; i <= this.scenarios.length; i++) {
      const next = this.scenarios[(idx + i) % this.scenarios.length];
      if (next && next.status === 'PENDING') return next.id;
    }

    return currentId;
  }
}
