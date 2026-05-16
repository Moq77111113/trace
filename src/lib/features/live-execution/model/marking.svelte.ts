import type { ExecutionApi, Verdict } from '../api/client';
import type { ScenarioSelection } from './selection.svelte';
import type { ExecutionPageData } from '$lib/server/executions/queries';

type Scenario = NonNullable<ExecutionPageData>['scenarios'][number];

export class ScenarioMarking {
  saveError: string | null = $state(null);

  constructor(private readonly selection: ScenarioSelection, private readonly api: ExecutionApi) {}

  markPassed  = (): void => this.mark('PASSED');
  markFailed  = (): void => this.mark('FAILED');
  markSkipped = (): void => this.mark('SKIPPED');

  private mark(status: Verdict): void {
    const target = this.selection.selected;
    if (!target) return;

    const previous = target.status;

    this.saveError = null;
    this.selection.replace(
      this.selection.scenarios.map((s) => (s.id === target.id ? { ...s, status } : s))
    );

    void this.patchWithRollback(target.id, status, previous);

    if (status !== 'FAILED') {
      this.selection.select(this.selection.pickNextPending(target.id));
    }
  }

  private async patchWithRollback(scenarioId: string, status: Verdict, previous: Scenario['status']): Promise<void> {
    try {
      await this.api.patchScenarioStatus(scenarioId, status);
    } catch (e) {
      this.selection.replace(
        this.selection.scenarios.map((s) => (s.id === scenarioId ? { ...s, status: previous } : s))
      );
      this.saveError = e instanceof Error ? e.message : 'Save failed';
    }
  }
}
