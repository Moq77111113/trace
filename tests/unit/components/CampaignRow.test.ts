import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CampaignRow from '$lib/features/campaign-manager/ui/CampaignRow.svelte';

const base = {
  slug: 'demo',
  campaign: {
    id: 'c1', name: 'Release 2.0', appVersion: '2.0.0', status: 'OPEN' as const, outcome: null,
    progress: { requiredPassed: 1, requiredTotal: 2 },
  },
};

describe('CampaignRow', () => {
  it('renders name, version, and an Open status pill', () => {
    render(CampaignRow, { props: base });
    expect(screen.getByText('Release 2.0')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders the Passed pill when closed and passed', () => {
    render(CampaignRow, { props: { slug: 'demo', campaign: { ...base.campaign, status: 'CLOSED', outcome: 'PASSED', progress: { requiredPassed: 2, requiredTotal: 2 } } } });
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('renders a neutral Inconclusive pill (not Failed) for a closed zero-required campaign', () => {
    render(CampaignRow, { props: { slug: 'demo', campaign: { ...base.campaign, status: 'CLOSED', outcome: 'INCONCLUSIVE', progress: { requiredPassed: 0, requiredTotal: 0 } } } });
    expect(screen.getByText('Inconclusive')).toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('renders the Failed pill when closed and failed', () => {
    render(CampaignRow, { props: { slug: 'demo', campaign: { ...base.campaign, status: 'CLOSED', outcome: 'FAILED', progress: { requiredPassed: 1, requiredTotal: 2 } } } });
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('links to the campaign detail page', () => {
    render(CampaignRow, { props: base });
    expect(screen.getByRole('link', { name: /Release 2\.0/ })).toHaveAttribute('href', '/p/demo/campaigns/c1');
  });
});
