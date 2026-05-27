import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CampaignProgress from '$lib/features/campaign-manager/ui/CampaignProgress.svelte';

describe('CampaignProgress', () => {
  it('shows required passed over total', () => {
    render(CampaignProgress, { props: { requiredPassed: 2, requiredTotal: 3 } });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('renders a full bar when all required pass', () => {
    render(CampaignProgress, { props: { requiredPassed: 3, requiredTotal: 3 } });
    expect(screen.getByTestId('campaign-progress-bar')).toHaveStyle({ width: '100%' });
  });

  it('renders an empty bar when there are no required features', () => {
    render(CampaignProgress, { props: { requiredPassed: 0, requiredTotal: 0 } });
    expect(screen.getByTestId('campaign-progress-bar')).toHaveStyle({ width: '0%' });
  });
});
