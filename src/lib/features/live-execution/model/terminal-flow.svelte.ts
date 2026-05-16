import type { ExecutionApi } from '../api/client';
import type { ScenarioSelection } from './selection.svelte';

export class TerminalFlow {
  confirmingFinish: boolean        = $state(false);
  confirmingAbort:  boolean        = $state(false);
  aborting:         boolean        = $state(false);
  abortError:       string | null  = $state(null);

  constructor(private readonly selection: ScenarioSelection, private readonly api: ExecutionApi) {}

  /** Returns `true` if the run can be finished right now; `false` if a confirm is required (and opens it). */
  requestFinish = (): boolean => {
    if (this.selection.pendingCount === 0) return true;
    this.confirmingFinish = true;
    return false;
  };

  cancelFinish = (): void => { this.confirmingFinish = false; };

  requestAbort = (): void => {
    this.abortError      = null;
    this.confirmingAbort = true;
  };

  cancelAbort = (): void => { this.confirmingAbort = false; };

  abort = async (): Promise<{ ok: boolean }> => {
    this.aborting   = true;
    this.abortError = null;
    try {
      await this.api.postAbort();
      this.selection.replace(
        this.selection.scenarios.map((s) => (s.status === 'PENDING' ? { ...s, status: 'SKIPPED' } : s))
      );
      this.confirmingAbort = false;
      return { ok: true };
    } catch (e) {
      this.abortError = e instanceof Error ? e.message : 'Abort failed';
      return { ok: false };
    } finally {
      this.aborting = false;
    }
  };
}
