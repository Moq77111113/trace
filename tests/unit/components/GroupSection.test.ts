import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import GroupSection from '$lib/features/feature-groups/ui/GroupSection.svelte';

describe('GroupSection', () => {
  it('renders title and feature count', () => {
    render(GroupSection, {
      props: { title: 'Auth', count: 3, collapsed: false, onToggle: () => {} },
    });
    expect(screen.getByText('Auth')).toBeInTheDocument();
    expect(screen.getByText(/3 features/)).toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', async () => {
    let toggled = false;
    render(GroupSection, {
      props: { title: 'Auth', count: 0, collapsed: false, onToggle: () => { toggled = true; } },
    });
    await fireEvent.click(screen.getByTestId('group-toggle'));
    expect(toggled).toBe(true);
  });
});
