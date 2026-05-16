import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RunReadonly from '$lib/components/RunReadonly.svelte';

const fakeData = {
  mode: 'readonly' as const,
  run: {
    id:                  'r1',
    status:              'FAILED' as const,
    startedAt:           new Date('2026-05-12T14:00:00Z'),
    finishedAt:          new Date('2026-05-12T14:05:00Z'),
    executedBy:          'Alice',
    environment:         'staging',
    notes:               null,
    source:              'MANUAL' as const,
    featureId:           'f1',
    featureContentAtRun: 'Feature: F\n  Scenario: A\n',
  },
  feature: {
    id:          'f1',
    projectId:   'p1',
    groupId:     null,
    name:        'Login',
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
      status:       'FAILED' as const,
      durationMs:   800,
      logs:         null,
      errorMessage: 'Expected red banner',
      updatedAt:    new Date(),
    },
  ],
  attachmentsByScenario: {
    s1: [
      { id: 'a1', scenarioResultId: 's1', filename: 'shot.png', mimeType: 'image/png', sizeBytes: 2048 },
      { id: 'a2', scenarioResultId: 's1', filename: 'console.log', mimeType: 'text/plain', sizeBytes: 512 },
    ],
  },
};

describe('RunReadonly', () => {
  it('renders feature name, status pill, error message and attachment list', () => {
    render(RunReadonly, { props: { data: fakeData } });

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getAllByText('failed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Expected red banner/)).toBeInTheDocument();
    expect(screen.getByText(/shot\.png/)).toBeInTheDocument();
    expect(screen.getByText(/console\.log/)).toBeInTheDocument();
  });

  it('opens the snapshot modal when Snapshot is clicked', async () => {
    render(RunReadonly, { props: { data: fakeData } });

    await fireEvent.click(screen.getByRole('button', { name: /snapshot/i }));

    expect(screen.getByText(/exact Gherkin/i)).toBeInTheDocument();
  });
});
