import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SummaryTile from '$lib/features/print-report/ui/blocks/SummaryTile.svelte';

describe('SummaryTile', () => {
  it('renders total / passed / failed / skipped', () => {
    render(SummaryTile, { props: { total: 10, passed: 7, failed: 2, skipped: 1, label: 'Scenarios' } });
    expect(screen.getByText('Scenarios')).toBeInTheDocument();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('10');
    expect(screen.getByTestId('summary-passed')).toHaveTextContent('7');
    expect(screen.getByTestId('summary-failed')).toHaveTextContent('2');
    expect(screen.getByTestId('summary-skipped')).toHaveTextContent('1');
  });

  it('renders zero state without crashing', () => {
    render(SummaryTile, { props: { total: 0, passed: 0, failed: 0, skipped: 0, label: 'Runs' } });
    expect(screen.getByTestId('summary-total')).toHaveTextContent('0');
  });
});
