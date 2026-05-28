import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ReportHeader from '$lib/features/print-report/ui/blocks/ReportHeader.svelte';

describe('ReportHeader', () => {
  it('renders title, code, status pill, and meta pairs', () => {
    render(ReportHeader, {
      props: {
        title:  'Login flow',
        code:   'TRC-12',
        status: 'PASSED',
        meta: [
          { label: 'env',      value: 'staging' },
          { label: 'started',  value: '2026-05-28 10:00' },
          { label: 'executor', value: 'Alice' },
        ],
      },
    });

    expect(screen.getByText('Login flow')).toBeInTheDocument();
    expect(screen.getByText('TRC-12')).toBeInTheDocument();
    expect(screen.getByText('passed')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('omits code when not provided', () => {
    render(ReportHeader, { props: { title: 'Aggregated', status: null, meta: [] } });
    expect(screen.getByText('Aggregated')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
