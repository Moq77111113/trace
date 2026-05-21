import { deserialize } from '$app/forms';

export class ManualNameTakenError extends Error {
  constructor(public readonly conflictWith: 'gherkin' | 'manual') {
    super(`manual scenario name already in use (${conflictWith})`);
    this.name = 'ManualNameTakenError';
  }
}

export type ManualScenarioRow = {
  id:        string;
  featureId: string;
  position:  number;
  name:      string;
  archived:  boolean;
  createdAt: Date;
  updatedAt: Date;
};

async function postAction(action: string, body: FormData): Promise<unknown> {
  const res = await fetch(`?/${action}`, {
    method:  'POST',
    body,
    headers: { 'x-sveltekit-action': 'true' },
  });
  const result = deserialize(await res.text());
  if (result.type === 'success') return result.data;
  if (result.type === 'failure') {
    const reason = (result.data as { reason?: string } | undefined)?.reason;
    if (reason === 'name-taken-manual') throw new ManualNameTakenError('manual');
    if (reason === 'name-taken-gherkin') throw new ManualNameTakenError('gherkin');
    throw new Error(`manual-scenarios ${action} failed`);
  }
  throw new Error(`manual-scenarios ${action}: ${result.type}`);
}

export type ManualScenariosClient = ReturnType<typeof createManualScenariosClient>;

export function createManualScenariosClient(featureId: string) {
  return {
    async add(name: string): Promise<ManualScenarioRow> {
      const body = new FormData();
      body.set('featureId', featureId);
      body.set('name',      name);
      const data = await postAction('addManualScenario', body) as { scenario: ManualScenarioRow };
      return data.scenario;
    },
    async rename(scenarioId: string, name: string): Promise<ManualScenarioRow> {
      const body = new FormData();
      body.set('scenarioId', scenarioId);
      body.set('name',       name);
      const data = await postAction('renameManualScenario', body) as { scenario: ManualScenarioRow };
      return data.scenario;
    },
    async archive(scenarioId: string): Promise<void> {
      const body = new FormData();
      body.set('scenarioId', scenarioId);
      await postAction('archiveManualScenario', body);
    },
    async reorder(order: string[]): Promise<void> {
      const body = new FormData();
      body.set('featureId', featureId);
      body.set('order',     order.join(','));
      await postAction('reorderManualScenarios', body);
    },
  };
}
