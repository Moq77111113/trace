import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AggregatedReportBody from '$lib/features/print-report/ui/AggregatedReportBody.svelte';

const baseRow = {
  id: '0193abcd-0000-7000-8000-000000000001',
  source: 'CI',
  executedBy: 'pipeline',
  environment: 'staging',
  startedAt: new Date('2026-05-28T10:00:00Z'),
  finishedAt: new Date('2026-05-28T10:01:00Z'),
  ciMetadata: null,
  featureName: 'Login',
  featureCode: 'TRC-1',
  passed: 5, failed: 0, skipped: 0, pending: 0,
};

const data = {
  project:    { name: 'Trace', slug: 'trace' },
  filters:    { environment: 'staging' },
  rows: [
    { ...baseRow, status: 'PASSED' },
    { ...baseRow, id: '0193abcd-0000-7000-8000-000000000002', status: 'FAILED', featureCode: 'TRC-2', featureName: 'Logout' },
  ],
};

describe('AggregatedReportBody', () => {
  it('renders project name, summary tile, and a row per run in scope=full', () => {
    render(AggregatedReportBody, { props: { data, scope: 'full' } });
    expect(screen.getByText('Trace')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('2');
  });

  it('drops passing runs from the table in scope=failed (summary still totals all)', () => {
    render(AggregatedReportBody, { props: { data, scope: 'failed' } });
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('2');
  });
});
