import { describe, expect, it } from 'vitest';
import { ScenarioSelection } from '$lib/features/live-execution/model/selection.svelte';

function scenario(id: string) {
  return {
    id,
    executionId:  'r1',
    scenarioName: id,
    position:     1,
    source:       'GHERKIN' as const,
    status:       'PENDING' as const,
    durationMs:   null,
    logs:         null,
    errorMessage: null,
    notes:        null,
    steps: [
      {
        id:               `${id}-1`,
        scenarioResultId: id,
        position:         1,
        keyword:          'Given',
        text:             'a',
        expected:         null,
        verdict:          'PENDING' as const,
        note:             null,
        updatedAt:        new Date(),
      },
      {
        id:               `${id}-2`,
        scenarioResultId: id,
        position:         2,
        keyword:          'Then',
        text:             'b',
        expected:         null,
        verdict:          'PENDING' as const,
        note:             null,
        updatedAt:        new Date(),
      },
    ],
    updatedAt: new Date(),
  };
}

describe('ScenarioSelection.markStepLocal', () => {
  it('updates the step verdict and derives the scenario status', () => {
    const sel = new ScenarioSelection([scenario('s1')]);
    sel.markStepLocal('s1-1', 'FAILED');
    const s = sel.scenarios.find((x) => x.id === 's1');
    expect(s?.steps[0]?.verdict).toBe('FAILED');
    expect(s?.status).toBe('FAILED');
  });

  it('keeps the scenario PENDING when a sibling step is still PENDING', () => {
    const sel = new ScenarioSelection([scenario('s1')]);
    sel.markStepLocal('s1-1', 'PASSED');
    const s = sel.scenarios.find((x) => x.id === 's1');
    expect(s?.steps[0]?.verdict).toBe('PASSED');
    expect(s?.status).toBe('PENDING');
  });

  it('leaves every scenario untouched for an unknown step id', () => {
    const sel = new ScenarioSelection([scenario('s1')]);
    sel.markStepLocal('nope', 'FAILED');
    const s = sel.scenarios.find((x) => x.id === 's1');
    expect(s?.status).toBe('PENDING');
    expect(s?.steps[0]?.verdict).toBe('PENDING');
    expect(s?.steps[1]?.verdict).toBe('PENDING');
  });
});
