import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LiveRun from '$lib/components/LiveRun.svelte';

const fakeData = {
  mode: 'live' as const,
  run: {
    id:                  'r1',
    status:              'RUNNING' as const,
    startedAt:           new Date(),
    finishedAt:          null,
    executedBy:          'Alice',
    environment:         'staging',
    notes:               null,
    source:              'MANUAL' as const,
    featureId:           'f1',
    featureContentAtRun: 'Feature: F\n',
  },
  feature: {
    id:          'f1',
    name:        'Login',
    projectId:   'p1',
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
    description: null,
    archived:    false,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  },
  scenarios: [
    {
      id:           's1',
      runId:        'r1',
      scenarioName: 'A',
      status:       'PENDING' as const,
      durationMs:   null,
      logs:         null,
      errorMessage: null,
      updatedAt:    new Date(),
    },
    {
      id:           's2',
      runId:        'r1',
      scenarioName: 'B',
      status:       'PENDING' as const,
      durationMs:   null,
      logs:         null,
      errorMessage: null,
      updatedAt:    new Date(),
    },
  ],
};

describe('LiveRun', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok:     true,
      status: 200,
      json:   async () => ({ status: 'PASSED' }),
    })));
  });

  it('renders the scenario list and focuses the first PENDING scenario', () => {
    render(LiveRun, { props: { data: fakeData } });

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /A/ })).toBeInTheDocument();
  });

  it('clicking Pass calls PATCH and auto-advances to the next PENDING', async () => {
    render(LiveRun, { props: { data: fakeData } });

    await fireEvent.click(screen.getByRole('button', { name: /pass/i }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/runs/r1/scenarios/s1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(screen.getByRole('heading', { level: 3, name: /B/ })).toBeInTheDocument();
  });

  it('P key marks the focused scenario as PASSED', async () => {
    render(LiveRun, { props: { data: fakeData } });

    await fireEvent.keyDown(window, { key: 'p' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/runs/r1/scenarios/s1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('ignores P when an input is focused', async () => {
    render(LiveRun, { props: { data: fakeData } });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    await fireEvent.keyDown(input, { key: 'p' });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('opens the confirm modal when Finish run is clicked with PENDING scenarios', async () => {
    render(LiveRun, { props: { data: fakeData } });

    await fireEvent.click(screen.getByRole('button', { name: /finish run/i }));

    expect(screen.getByText(/scenario.+still pending/i)).toBeInTheDocument();
  });
});
