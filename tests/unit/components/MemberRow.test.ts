import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MemberRow from '$lib/features/campaign-manager/ui/MemberRow.svelte';

const member = { featureId: 'f1', code: 'demo-1', name: 'Checkout', required: true, position: 1, status: 'PASSED' as const };

describe('MemberRow', () => {
  it('renders code, name, and a passed status badge', () => {
    render(MemberRow, { props: { member, locked: false } });
    expect(screen.getByText('demo-1')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('shows "Not run" when status is null', () => {
    render(MemberRow, { props: { member: { ...member, status: null }, locked: false } });
    expect(screen.getByText('Not run')).toBeInTheDocument();
  });

  it('hides mutation forms when locked', () => {
    render(MemberRow, { props: { member, locked: true } });
    expect(screen.queryByTestId('member-remove-form')).not.toBeInTheDocument();
  });
});
