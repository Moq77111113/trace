import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ScenarioSteps from '$lib/entities/execution/ui/ScenarioSteps.svelte';

describe('ScenarioSteps per-step verdict', () => {
  it('uses each step verdict when present', () => {
    const { container } = render(ScenarioSteps, {
      props: {
        scenarioStatus: 'FAILED',
        steps: [
          { keyword: 'Given', text: 'a', verdict: 'PASSED' },
          { keyword: 'Then',  text: 'b', verdict: 'FAILED' },
        ],
      },
    });

    const indicators = container.querySelectorAll('ol li [data-s]');
    expect(indicators[0]?.getAttribute('data-s')).toBe('pass');
    expect(indicators[1]?.getAttribute('data-s')).toBe('fail');
  });
});
