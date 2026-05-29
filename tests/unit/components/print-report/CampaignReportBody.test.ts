import type { ComponentProps } from 'svelte';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CampaignReportBody from '$lib/features/print-report/ui/CampaignReportBody.svelte';

type Data = ComponentProps<typeof CampaignReportBody>['data'];

const member1 = {
  featureId: 'f1', code: 'TRC-1', name: 'Login', required: true,
  status: 'FAILED', latestExecutionId: 'e1',
  evidence: {
    execution: { id: 'e1', status: 'FAILED', source: 'CI', environment: null,
      startedAt: new Date(), finishedAt: new Date(), executedBy: 'pipeline', ciMetadata: null,
      featureContentAtStart: '' },
    feature: { id: 'f1', name: 'Login', codeSeq: 1 },
    project: { id: 'p1', name: 'Trace', slug: 'trace', codePrefix: 'TRC' },
    scenarios: [{ id: 's1', scenarioName: 'Boom', status: 'FAILED', errorMessage: 'oops', steps: [] }],
    attachmentsByScenario: {},
  },
};
const member2 = {
  featureId: 'f2', code: 'TRC-2', name: 'Logout', required: false,
  status: 'PASSED', latestExecutionId: 'e2',
  evidence: {
    execution: { id: 'e2', status: 'PASSED', source: 'MANUAL', environment: null,
      startedAt: new Date(), finishedAt: new Date(), executedBy: 'Alice', ciMetadata: null,
      featureContentAtStart: '' },
    feature: { id: 'f2', name: 'Logout', codeSeq: 2 },
    project: { id: 'p1', name: 'Trace', slug: 'trace', codePrefix: 'TRC' },
    scenarios: [{ id: 's2', scenarioName: 'Goodbye', status: 'PASSED', errorMessage: null, steps: [] }],
    attachmentsByScenario: {},
  },
};

const data = {
  campaign: { name: 'Release 1.0', status: 'OPEN', openedAt: new Date('2026-05-01'), closedAt: null },
  project:  { id: 'p1', slug: 'trace' },
  progress: { requiredPassed: 0, requiredTotal: 1, optionalPassed: 1, optionalTotal: 1 },
  members:  [member1, member2],
} as unknown as Data;

describe('CampaignReportBody', () => {
  it('renders members table + evidence for all members in scope=full', () => {
    render(CampaignReportBody, { props: { data, scope: 'full' } });
    expect(screen.getByText('Release 1.0')).toBeInTheDocument();
    expect(screen.getAllByText('Login').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByText('Goodbye')).toBeInTheDocument();
  });

  it('drops optional members from evidence in scope=required', () => {
    render(CampaignReportBody, { props: { data, scope: 'required' } });
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.queryByText('Goodbye')).not.toBeInTheDocument();
  });

  it('drops passing members from evidence in scope=failed', () => {
    render(CampaignReportBody, { props: { data, scope: 'failed' } });
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.queryByText('Goodbye')).not.toBeInTheDocument();
  });
});
