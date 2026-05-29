import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RunReportBody from '$lib/features/print-report/ui/RunReportBody.svelte';
import type { ExecutionPageData } from '$lib/server/executions/read/queries';

const featureContent = `Feature: Login\n\n  Scenario: Pass\n    Given x\n\n  Scenario: Fail\n    When y\n`;

const data: NonNullable<ExecutionPageData> = {
  mode: 'readonly',
  execution: {
    id:                    '0193abcd-0000-7000-8000-000000000001',
    featureId:             'f1',
    status:                'FAILED',
    source:                'MANUAL',
    environment:           'staging',
    featureContentAtStart: featureContent,
    startedAt:             new Date('2026-05-28T10:00:00Z'),
    finishedAt:            new Date('2026-05-28T10:01:30Z'),
    executedBy:            'Alice',
    ciMetadata:            null,
    campaignId:            null,
  },
  feature: {
    id:          'f1',
    projectId:   'p1',
    groupId:     null,
    codeSeq:     1,
    name:        'Login',
    description: null,
    content:     featureContent,
    parseErrors: null,
    version:     1,
    archived:    false,
    createdAt:   new Date('2026-05-28T09:00:00Z'),
    updatedAt:   new Date('2026-05-28T09:00:00Z'),
  },
  project: {
    id:          'p1',
    name:        'Trace',
    slug:        'trace',
    codePrefix:  'TRC',
    description: null,
    createdBy:   null,
    archived:    false,
    createdAt:   new Date('2026-05-28T08:00:00Z'),
    updatedAt:   new Date('2026-05-28T08:00:00Z'),
  },
  scenarios: [
    {
      id:           's1',
      executionId:  '0193abcd-0000-7000-8000-000000000001',
      scenarioName: 'Pass',
      source:       'GHERKIN',
      position:     1,
      status:       'PASSED',
      durationMs:   null,
      logs:         null,
      errorMessage: null,
      notes:        null,
      steps:        [{ keyword: 'Given', text: 'x', expected: null }],
      updatedAt:    new Date('2026-05-28T10:00:30Z'),
    },
    {
      id:           's2',
      executionId:  '0193abcd-0000-7000-8000-000000000001',
      scenarioName: 'Fail',
      source:       'GHERKIN',
      position:     2,
      status:       'FAILED',
      durationMs:   null,
      logs:         null,
      errorMessage: 'boom',
      notes:        null,
      steps:        [{ keyword: 'When', text: 'y', expected: null }],
      updatedAt:    new Date('2026-05-28T10:01:00Z'),
    },
  ],
  attachmentsByScenario: {},
};

describe('RunReportBody', () => {
  it('renders header, summary tile, and a block per scenario in scope=full', () => {
    render(RunReportBody, { props: { data, scope: 'full' } });
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('TRC-1')).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText('Fail')).toBeInTheDocument();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('2');
  });

  it('drops passing scenarios in scope=failed', () => {
    render(RunReportBody, { props: { data, scope: 'failed' } });
    expect(screen.queryByText('Pass')).not.toBeInTheDocument();
    expect(screen.getByText('Fail')).toBeInTheDocument();
  });
});
