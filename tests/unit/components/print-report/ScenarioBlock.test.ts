import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ScenarioBlock from '$lib/features/print-report/ui/blocks/ScenarioBlock.svelte';

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
    { id: 'a1', filename: 'screen.png', mimeType: 'image/png',  sizeBytes: 1024 },
    { id: 'a2', filename: 'log.txt',    mimeType: 'text/plain', sizeBytes:  512 },
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
});
