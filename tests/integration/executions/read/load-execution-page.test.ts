import { describe, expect, it } from 'vitest';
import { mkProject, mkFeature } from '$testing/fixtures';
import { startExecution } from '$lib/server/executions/run/start';
import { loadExecutionPage } from '$lib/server/executions/read/queries';

describe('loadExecutionPage steps', () => {
  it('attaches ordered steps with verdicts to each scenario', async () => {
    const project = await mkProject({ name: `Load ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, {
      name: 'F', content: 'Feature: F\n  Scenario: S\n    Given a\n    Then b\n',
    });
    const run = await startExecution({ featureId: feature.id, executedBy: 'tester' });

    const data = await loadExecutionPage(run.id);
    expect(data?.scenarios?.[0]?.steps.map((s) => [s.text, s.verdict])).toEqual([
      ['a', 'PENDING'], ['b', 'PENDING'],
    ]);
  });
});
