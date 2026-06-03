import { describe, expect, it } from 'vitest';
import { buildScenarioRows, buildStepRows, type FrozenStep } from '$lib/server/executions/run/scenario-rows';

describe('buildScenarioRows', () => {
  it('renumbers position per source section', () => {
    const rows = buildScenarioRows([
      { scenarioName: 'g1', source: 'GHERKIN', steps: [] },
      { scenarioName: 'm1', source: 'MANUAL',  steps: [] },
      { scenarioName: 'g2', source: 'GHERKIN', steps: [] },
    ]);
    expect(rows.map((r) => [r.source, r.position])).toEqual([
      ['GHERKIN', 1], ['MANUAL', 1], ['GHERKIN', 2],
    ]);
  });
});

describe('buildStepRows', () => {
  it('numbers steps from 1 and pins them to the scenario result id', () => {
    const steps: FrozenStep[] = [
      { keyword: 'Given', text: 'a', expected: null },
      { keyword: null,    text: 'b', expected: 'ok' },
    ];
    const rows = buildStepRows('sr-1', steps);
    expect(rows).toEqual([
      { scenarioResultId: 'sr-1', position: 1, keyword: 'Given', text: 'a', expected: null, verdict: 'PENDING' },
      { scenarioResultId: 'sr-1', position: 2, keyword: null,    text: 'b', expected: 'ok', verdict: 'PENDING' },
    ]);
  });
});
