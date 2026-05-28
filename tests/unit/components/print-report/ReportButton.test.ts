import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ReportButton from '$lib/features/print-report/ui/ReportButton.svelte';

describe('ReportButton', () => {
  it('renders the main link to the default scope', () => {
    render(ReportButton, {
      props: {
        href: '/p/trace/executions/abc/report.html',
        options: [
          { label: 'Full',           scope: null },
          { label: 'Failures only',  scope: 'failed' },
        ],
      },
    });
    const main = screen.getByRole('link', { name: 'Report' }) as HTMLAnchorElement;
    expect(main.href).toContain('/p/trace/executions/abc/report.html');
    expect(main.target).toBe('_blank');
  });

  it('opens the dropdown with one entry per option', async () => {
    render(ReportButton, {
      props: {
        href: '/p/trace/executions/abc/report.html',
        options: [
          { label: 'Full',          scope: null },
          { label: 'Failures only', scope: 'failed' },
        ],
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Open report options' }));
    const failed = screen.getByRole('link', { name: 'Failures only' }) as HTMLAnchorElement;
    expect(failed.href).toContain('scope=failed');
  });
});
