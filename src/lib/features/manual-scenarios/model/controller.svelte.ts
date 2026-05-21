import * as m from '$lib/paraglide/messages';
import type { ManualScenarioRow, ManualScenariosClient } from '../api/client';
import { createManualScenariosClient, ManualNameTakenError } from '../api/client';

export class ManualScenariosController {
  rows:   ManualScenarioRow[] = $state([]);
  saving: boolean             = $state(false);
  error:  string | null       = $state(null);

  private readonly client: ManualScenariosClient;

  constructor(featureId: string, initial: ManualScenarioRow[]) {
    this.client = createManualScenariosClient(featureId);
    this.rows   = [...initial];
  }

  get empty(): boolean {
    return this.rows.length === 0;
  }

  add = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await this.run(() => this.client.add(trimmed));
    if (created) this.rows = [...this.rows, created];
  };

  rename = async (id: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = await this.run(() => this.client.rename(id, trimmed));
    if (updated) this.rows = this.rows.map((r) => (r.id === id ? updated : r));
  };

  archive = async (id: string): Promise<void> => {
    const before = this.rows;
    this.rows = this.rows.filter((r) => r.id !== id);
    const ok = await this.run(() => this.client.archive(id));
    if (ok === null) this.rows = before;
  };

  reorder = async (order: string[]): Promise<void> => {
    const before = this.rows;
    const byId   = new Map(this.rows.map((r) => [r.id, r]));
    this.rows = order
      .map((id, i) => {
        const row = byId.get(id);
        return row ? { ...row, position: i + 1 } : null;
      })
      .filter((r): r is ManualScenarioRow => r !== null);
    const ok = await this.run(() => this.client.reorder(order));
    if (ok === null) this.rows = before;
  };

  private async run<T>(fn: () => Promise<T>): Promise<T | null> {
    this.saving = true;
    this.error  = null;
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ManualNameTakenError) {
        this.error = e.conflictWith === 'gherkin'
          ? m.manual_scenario_name_taken_gherkin()
          : m.manual_scenario_name_taken_manual();
      } else {
        this.error = (e as Error).message;
      }
      return null;
    } finally {
      this.saving = false;
    }
  }
}
