import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MembersTable from '$lib/features/print-report/ui/blocks/MembersTable.svelte';

const members = [
  { featureId: 'f1', code: 'TRC-1', name: 'Login',  required: true,  status: 'PASSED', latestExecutionId: 'e1' },
  { featureId: 'f2', code: 'TRC-2', name: 'Logout', required: false, status: 'FAILED', latestExecutionId: 'e2' },
  { featureId: 'f3', code: 'TRC-3', name: 'New',    required: true,  status: null,     latestExecutionId: null },
];

describe('MembersTable', () => {
  it('renders one row per member with status and required flag', () => {
    render(MembersTable, { props: { members, projectSlug: 'trace' } });
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getAllByText('required')).toHaveLength(2);
  });

  it('renders "never run" for members without a latest execution', () => {
    render(MembersTable, { props: { members, projectSlug: 'trace' } });
    expect(screen.getByText('never run')).toBeInTheDocument();
  });

  it('links to the per-run report when a latest execution exists', () => {
    render(MembersTable, { props: { members, projectSlug: 'trace' } });
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    expect(links.map((l) => l.href).some((h) => h.includes('/executions/e1/report.html'))).toBe(true);
  });
});
