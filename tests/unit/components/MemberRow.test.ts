import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

vi.mock('$app/state', () => ({
  page: { data: { capabilities: ['execution.run', 'campaign.manage'] } },
}));

import MemberRow from '$lib/features/campaign-manager/ui/MemberRow.svelte';

const member = { featureId: 'f1', code: 'demo-1', name: 'Checkout', required: true, position: 1, status: 'PASSED' as const, runnable: true, latestExecutionId: 'e1' };

describe('MemberRow', () => {
  it('renders code, name, and a passed status badge', () => {
    render(MemberRow, { props: { member, locked: false, slug: 'demo' } });
    expect(screen.getByText('demo-1')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('shows "Not run" when status is null', () => {
    render(MemberRow, { props: { member: { ...member, status: null, latestExecutionId: null }, locked: false, slug: 'demo' } });
    expect(screen.getByText('Not run')).toBeInTheDocument();
  });

  it('hides mutation forms when locked', () => {
    render(MemberRow, { props: { member, locked: true, slug: 'demo' } });
    expect(screen.queryByTestId('member-remove-form')).not.toBeInTheDocument();
  });

  it('disables Run when the feature is not runnable', () => {
    render(MemberRow, { props: { member: { ...member, runnable: false, status: null, latestExecutionId: null }, locked: false, slug: 'demo' } });
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  });

  it('links the status badge to its latest execution', () => {
    render(MemberRow, { props: { member: { ...member, status: 'PASSED', latestExecutionId: 'e1' }, locked: false, slug: 'demo' } });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/p/demo/executions/e1');
  });

  it('renders no execution link when status is null', () => {
    render(MemberRow, { props: { member: { ...member, status: null, latestExecutionId: null }, locked: false, slug: 'demo' } });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
