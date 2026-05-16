import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import GroupSection from '$lib/features/feature-groups/ui/GroupSection.svelte';

describe('GroupSection', () => {
  it('renders title and feature count', () => {
    render(GroupSection, {
      props: { title: 'Auth', count: 3, draggable: true, collapsed: false, onToggle: () => {} },
    });
    expect(screen.getByText('Auth')).toBeInTheDocument();
    expect(screen.getByText(/3 features/)).toBeInTheDocument();
  });

  it('renders the drag handle only when draggable', () => {
    const { rerender } = render(GroupSection, {
      props: { title: 'Sans groupe', count: 1, draggable: false, collapsed: false, onToggle: () => {} },
    });
    expect(screen.queryByTestId('drag-handle')).toBeNull();

    rerender({ title: 'Auth', count: 1, draggable: true, collapsed: false, onToggle: () => {} });
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', async () => {
    let toggled = false;
    render(GroupSection, {
      props: { title: 'Auth', count: 0, draggable: true, collapsed: false, onToggle: () => { toggled = true; } },
    });
    await fireEvent.click(screen.getByTestId('group-toggle'));
    expect(toggled).toBe(true);
  });
});
