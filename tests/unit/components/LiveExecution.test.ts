import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LiveExecution from '$lib/features/live-execution/ui/LiveExecution.svelte';

vi.mock('$lib/shared/authz/can', () => ({ can: (action: string) => action === 'execution.run' }));

const fakeData = {
  mode: 'live' as const,
  execution: {
    id:                  'r1',
    status:              'IN_PROGRESS' as const,
    startedAt:           new Date(),
    finishedAt:          null,
    executedBy:          'Alice',
    environment:         'staging',
    notes:               null,
    source:              'MANUAL' as const,
    featureId:           'f1',
    featureContentAtStart: 'Feature: F\n',
    ciMetadata:          null,
  },
  feature: {
    id:          'f1',
    projectId:   'p1',
    groupId:     null,
    codeSeq:     1,
    name:        'Login',
    description: null,
    content:     'Feature: F\n',
    parseErrors: null,
    archived:    false,
    version:     1,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  },
  project: {
    id:          'p1',
    name:        'P',
    slug:        'p1',
    codePrefix:  'p1',
    description: null,
    createdBy:   null,
    archived:    false,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  },
  scenarios: [
    {
      id:           's1',
      executionId:  'r1',
      scenarioName: 'A',
      position:     1,
      source:       'GHERKIN' as const,
      status:       'PENDING' as const,
      durationMs:   null,
      logs:         null,
      errorMessage: null,
      notes:        null,
      updatedAt:    new Date(),
    },
    {
      id:           's2',
      executionId:  'r1',
      scenarioName: 'B',
      position:     2,
      source:       'GHERKIN' as const,
      status:       'PENDING' as const,
      durationMs:   null,
      logs:         null,
      errorMessage: null,
      notes:        null,
      updatedAt:    new Date(),
    },
  ],
  attachmentsByScenario: {},
};

describe('LiveExecution', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok:      true,
      status:  200,
      headers: new Headers(),
      text:    async () => '{"type":"success","status":200}',
      json:    async () => ({ type: 'success', status: 200 }),
    })));
  });

  it('renders the scenario list and focuses the first PENDING scenario', () => {
    render(LiveExecution, { props: { data: fakeData } });

    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /A/ })).toBeInTheDocument();
  });

  it('clicking Pass submits the setStatus form action and auto-advances', async () => {
    render(LiveExecution, { props: { data: fakeData } });

    await fireEvent.click(screen.getByRole('button', { name: /pass/i }));

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(String(calls[0]?.[0])).toContain('?/setStatus');
    expect(calls[0]?.[1]?.method).toBe('POST');
    expect(screen.getByRole('heading', { level: 2, name: /B/ })).toBeInTheDocument();
  });

  it('P key submits the setStatus form action for the focused scenario', async () => {
    render(LiveExecution, { props: { data: fakeData } });

    await fireEvent.keyDown(window, { key: 'p' });

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(String(calls[0]?.[0])).toContain('?/setStatus');
    expect(calls[0]?.[1]?.method).toBe('POST');
  });

  it('ignores P when an input is focused', async () => {
    render(LiveExecution, { props: { data: fakeData } });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    await fireEvent.keyDown(input, { key: 'p' });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('opens the confirm modal when Finish run is clicked with PENDING scenarios', async () => {
    render(LiveExecution, { props: { data: fakeData } });

    await fireEvent.click(screen.getByRole('button', { name: /finish run/i }));

    expect(screen.getByText(/scenario.+still pending/i)).toBeInTheDocument();
  });

  it('shows the no-steps line on a selected MANUAL scenario', () => {
    const baseScenario = fakeData.scenarios[0]!;
    const manualRow = {
      ...baseScenario,
      id:           'sm1',
      scenarioName: 'Manual one',
      source:       'MANUAL' as const,
      position:     1,
    };
    const dataWithManual = {
      ...fakeData,
      scenarios: [baseScenario, manualRow],
    };
    render(LiveExecution, { props: { data: dataWithManual } });

    fireEvent.click(screen.getByText('Manual one'));

    expect(screen.getByText(/manual check\. no automated steps/i)).toBeInTheDocument();
  });

  it('renders Automated and Manual section headers when both kinds are present', () => {
    const baseScenario = fakeData.scenarios[0]!;
    const dataWithManual = {
      ...fakeData,
      scenarios: [
        baseScenario,
        {
          ...baseScenario,
          id:           'sm1',
          scenarioName: 'Manual one',
          source:       'MANUAL' as const,
          position:     1,
        },
      ],
    };
    render(LiveExecution, { props: { data: dataWithManual } });
    expect(screen.getByText(/automated/i)).toBeInTheDocument();
    expect(screen.getByText(/manual checks/i)).toBeInTheDocument();
  });
});
