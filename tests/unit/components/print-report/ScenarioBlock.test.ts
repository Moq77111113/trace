import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ScenarioBlock from '$lib/features/print-report/ui/blocks/ScenarioBlock.svelte';

const perStepVerdicts = {
  scenario: {
    id: 's4',
    name: 'Mixed verdicts',
    status: 'FAILED',
    steps: [
      { keyword: 'Given', text: 'a passing step', verdict: 'PASSED' },
      { keyword: 'When',  text: 'a failing step', verdict: 'FAILED' },
    ],
    errorMessage: null,
  },
  attachments: [],
};

const passing = {
  scenario: {
    id: 's1',
    name: 'User logs in',
    status: 'PASSED',
    steps: [
      { keyword: 'Given', text: 'a user', line: 1 },
      { keyword: 'When',  text: 'they log in', line: 2 },
      { keyword: 'Then',  text: 'they see the dashboard', line: 3 },
    ],
    errorMessage: null,
  },
  attachments: [],
};

const failing = {
  scenario: { ...passing.scenario, id: 's2', name: 'User fails', status: 'FAILED', errorMessage: 'boom' },
  attachments: [
    { id: 'a1', scenarioResultStepId: null, filename: 'screen.png', mimeType: 'image/png',  sizeBytes: 1024 },
    { id: 'a2', scenarioResultStepId: null, filename: 'log.txt',    mimeType: 'text/plain', sizeBytes:  512 },
  ],
};

const perStepEvidence = {
  scenario: {
    id: 's5',
    name: 'Step with note and evidence',
    status: 'FAILED',
    steps: [
      { id: 'st5-1', keyword: 'Given', text: 'a checked step', verdict: 'FAILED', note: 'looked wrong here' },
    ],
    errorMessage: null,
  },
  attachments: [
    { id: 'ev1', scenarioResultStepId: 'st5-1', filename: 'step-shot.png', mimeType: 'image/png', sizeBytes: 2048 },
  ],
};

const manual = {
  scenario: {
    id: 's3',
    name: 'Visual review',
    status: 'PASSED',
    steps: [
      { keyword: null, text: 'open the homepage', expected: null },
      { keyword: null, text: 'check the hero banner', expected: 'banner is centered' },
    ],
    errorMessage: null,
  },
  attachments: [],
};

describe('ScenarioBlock', () => {
  it('renders scenario name, status pill, and all steps', () => {
    render(ScenarioBlock, { props: passing });
    expect(screen.getByText('User logs in')).toBeInTheDocument();
    expect(screen.getByText('passed')).toBeInTheDocument();
    expect(screen.getByText(/Given/)).toBeInTheDocument();
    expect(screen.getByText(/they see the dashboard/)).toBeInTheDocument();
  });

  it('renders error message and inline image for failures', () => {
    render(ScenarioBlock, { props: failing });
    expect(screen.getByText('boom')).toBeInTheDocument();
    const img = screen.getByAltText('screen.png') as HTMLImageElement;
    expect(img.src).toContain('/api/attachments/a1');
    expect(screen.getByText(/log\.txt/)).toBeInTheDocument();
  });

  it('renders manual steps with an expected sub-line and no keyword', () => {
    render(ScenarioBlock, { props: manual });
    expect(screen.getByText('open the homepage')).toBeInTheDocument();
    expect(screen.getByText('check the hero banner')).toBeInTheDocument();
    expect(screen.getByText('banner is centered')).toBeInTheDocument();
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });

  it('renders a step note and pins step-scoped evidence under the step', () => {
    const { container } = render(ScenarioBlock, { props: perStepEvidence });
    expect(screen.getByText('looked wrong here')).toBeInTheDocument();
    const stepList = container.querySelector('ol');
    const img = screen.getByAltText('step-shot.png');
    expect(stepList).not.toBeNull();
    expect(stepList?.contains(img)).toBe(true);
  });

  it('renders each step with its own frozen verdict', () => {
    const { container } = render(ScenarioBlock, { props: perStepVerdicts });
    const marks = container.querySelectorAll('ol li [data-s]');
    expect(marks[0]?.getAttribute('data-s')).toBe('pass');
    expect(marks[1]?.getAttribute('data-s')).toBe('fail');
  });
});
