import type { ExecutionPageData } from '$lib/server/executions/queries';

type RunData  = NonNullable<ExecutionPageData>;
type Scenario = RunData['scenarios'][number];

export type ScenarioFilter = 'all' | 'failed' | 'pending';

export class ScenarioSelection {
  scenarios:  Scenario[]     = $state([]);
  selectedId: string         = $state('');
  filter:     ScenarioFilter = $state('all');

  readonly counts           = $derived({
    total: this.scenarios.length,
    done:  this.scenarios.filter((s) => s.status !== 'PENDING').length,
  });
  readonly pendingCount     = $derived(this.scenarios.filter((s) => s.status === 'PENDING').length);
  readonly failedCount      = $derived(this.scenarios.filter((s) => s.status === 'FAILED').length);
  readonly selected         = $derived<Scenario | undefined>(this.scenarios.find((s) => s.id === this.selectedId));
  readonly visibleScenarios = $derived<Scenario[]>(this.scenarios.filter((s) => this.matches(s)));

  constructor(scenarios: Scenario[]) {
    this.scenarios  = scenarios.slice();
    this.selectedId = this.firstPendingId();
  }

  select    = (id: string):            void => { this.selectedId = id; };
  setFilter = (filter: ScenarioFilter): void => { this.filter = filter; };
  moveDown  = (): void => this.move(1);
  moveUp    = (): void => this.move(-1);

  jumpToNextPending = (): void => {
    const next = this.pickNextPending(this.selectedId);
    if (next) this.selectedId = next;
  };

  replace = (next: Scenario[]): void => { this.scenarios = next; };

  pickNextPending(currentId: string): string {
    const idx = this.scenarios.findIndex((s) => s.id === currentId);
    if (idx < 0) return currentId;

    for (let i = 1; i <= this.scenarios.length; i++) {
      const next = this.scenarios[(idx + i) % this.scenarios.length];
      if (next && next.status === 'PENDING') return next.id;
    }
    return currentId;
  }

  private matches(scenario: Scenario): boolean {
    if (this.filter === 'failed')  return scenario.status === 'FAILED';
    if (this.filter === 'pending') return scenario.status === 'PENDING';
    return true;
  }

  private move(delta: -1 | 1): void {
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

  private firstPendingId(): string {
    const pending = this.scenarios.find((s) => s.status === 'PENDING');
    if (pending) return pending.id;
    return this.scenarios[0]?.id ?? '';
  }
}
