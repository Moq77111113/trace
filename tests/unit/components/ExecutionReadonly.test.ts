import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ExecutionReadonly from '$lib/features/execution-replay/ui/ExecutionReadonly.svelte';

const fakeData = {
  mode: 'readonly' as const,
  execution: {
    id:                  'r1',
    status:              'FAILED' as const,
    startedAt:           new Date('2026-05-12T14:00:00Z'),
    finishedAt:          new Date('2026-05-12T14:05:00Z'),
    executedBy:          'Alice',
    environment:         'staging',
    notes:               null,
    source:              'MANUAL' as const,
    featureId:           'f1',
    featureContentAtStart: 'Feature: F\n  Scenario: A\n',
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
      status:       'FAILED' as const,
      durationMs:   800,
      logs:         null,
      errorMessage: 'Expected red banner',
      notes:        null,
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

describe('ExecutionReadonly', () => {
  it('renders feature name, status pill, error message and attachment list', () => {
    render(ExecutionReadonly, { props: { data: fakeData } });

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getAllByText('failed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Expected red banner/)).toBeInTheDocument();
    expect(screen.getByText(/shot\.png/)).toBeInTheDocument();
    expect(screen.getByText(/console\.log/)).toBeInTheDocument();
  });

  it('opens the snapshot modal when Snapshot is clicked', async () => {
    render(ExecutionReadonly, { props: { data: fakeData } });

    await fireEvent.click(screen.getByRole('button', { name: /snapshot/i }));

    expect(screen.getByText(/exact Gherkin/i)).toBeInTheDocument();
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
      scenarios: [manualRow, baseScenario],
    };
    render(ExecutionReadonly, { props: { data: dataWithManual } });

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
    render(ExecutionReadonly, { props: { data: dataWithManual } });
    expect(screen.getByText(/automated/i)).toBeInTheDocument();
    expect(screen.getByText(/manual checks/i)).toBeInTheDocument();
  });
});
