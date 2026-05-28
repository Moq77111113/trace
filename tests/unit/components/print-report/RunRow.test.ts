import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RunRow from '$lib/features/print-report/ui/blocks/RunRow.svelte';

const row = {
  id:          '0193abcd-0000-7000-8000-000000000001',
  status:      'PASSED',
  source:      'CI',
  executedBy:  'pipeline',
  environment: 'staging',
  startedAt:   new Date('2026-05-28T10:00:00Z'),
  finishedAt:  new Date('2026-05-28T10:01:00Z'),
  ciMetadata:  null,
  featureName: 'Login',
  featureCode: 'TRC-1',
  passed: 5, failed: 0, skipped: 1, pending: 0,
};

describe('RunRow', () => {
  it('renders status, feature code+name, env, counts, and a per-run link', () => {
    render(RunRow, { props: { row, projectSlug: 'trace' } });
    expect(screen.getByText('TRC-1')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    const link = screen.getByRole('link') as HTMLAnchorElement;
    expect(link.href).toContain(`/p/trace/executions/${row.id}/report.html`);
  });
});
