import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ScenarioSidebar from '$lib/entities/execution/ui/ScenarioSidebar.svelte';

const scenarios = [
  { id: 's1', scenarioName: 'G one', status: 'PENDING', durationMs: null, source: 'GHERKIN' as const },
  { id: 's2', scenarioName: 'G two', status: 'PASSED',  durationMs: 200,  source: 'GHERKIN' as const },
  { id: 's3', scenarioName: 'M one', status: 'PENDING', durationMs: null, source: 'MANUAL'  as const },
];

describe('ScenarioSidebar', () => {
  it('renders Automated and Manual section headers when both kinds are present', () => {
    render(ScenarioSidebar, {
      props: { scenarios, selectedId: 's1', onSelect: () => {} },
    });
    expect(screen.getByText(/automated/i)).toBeInTheDocument();
    expect(screen.getByText(/manual checks/i)).toBeInTheDocument();
    expect(screen.getByText('G one')).toBeInTheDocument();
    expect(screen.getByText('M one')).toBeInTheDocument();
  });

  it('omits a section header when that section has zero items', () => {
    const onlyGherkin = [scenarios[0]!, scenarios[1]!];
    render(ScenarioSidebar, {
      props: { scenarios: onlyGherkin, selectedId: 's1', onSelect: () => {} },
    });
    expect(screen.queryByText(/manual checks/i)).not.toBeInTheDocument();
    expect(screen.getByText(/automated/i)).toBeInTheDocument();
  });

  it('omits the Automated header when only manual scenarios are present', () => {
    const onlyManual = [scenarios[2]!];
    render(ScenarioSidebar, {
      props: { scenarios: onlyManual, selectedId: 's3', onSelect: () => {} },
    });
    expect(screen.queryByText(/automated/i)).not.toBeInTheDocument();
    expect(screen.getByText(/manual checks/i)).toBeInTheDocument();
  });

  it('fires onSelect with the row id when a scenario is clicked', async () => {
    const onSelect = vi.fn();
    render(ScenarioSidebar, { props: { scenarios, selectedId: 's1', onSelect } });

    await fireEvent.click(screen.getByText('M one'));
    expect(onSelect).toHaveBeenCalledWith('s3');
  });
});
