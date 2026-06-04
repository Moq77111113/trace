import { describe, expect, it } from 'vitest';
import { ScenarioSelection } from '$lib/features/live-execution/model/selection.svelte';

function scenario(id: string) {
  return {
    id, scenarioName: id, source: 'GHERKIN' as const, status: 'PENDING',
    durationMs: null, notes: null, errorMessage: null, logs: null,
    steps: [
      { id: `${id}-1`, position: 1, keyword: 'Given', text: 'a', expected: null, verdict: 'PENDING', note: null },
      { id: `${id}-2`, position: 2, keyword: 'Then',  text: 'b', expected: null, verdict: 'PENDING', note: null },
    ],
  };
}

describe('ScenarioSelection.markStepLocal', () => {
  it('updates the step verdict and derives the scenario status', () => {
    const sel = new ScenarioSelection([scenario('s1') as never]);
    sel.markStepLocal('s1-1', 'FAILED');
    const s = sel.scenarios.find((x) => x.id === 's1');
    expect(s?.steps[0]?.verdict).toBe('FAILED');
    expect(s?.status).toBe('FAILED');
  });
});
