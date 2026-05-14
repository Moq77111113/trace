import { describe, it, expect } from 'vitest';
import { render, screen }       from '@testing-library/svelte';
import { createRawSnippet }     from 'svelte';
import Button                   from '$lib/components/ui/Button.svelte';

const textSnippet = (text: string) =>
  createRawSnippet(() => ({ render: () => text }));

describe('Button', () => {
  it('renders children and respects variant prop', () => {
    render(Button, { props: { variant: 'danger', children: textSnippet('Delete') } });

    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/bg-state-failed/);
  });

  it('disables when loading', () => {
    render(Button, { props: { loading: true, children: textSnippet('Save') } });

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as an anchor when href is provided', () => {
    render(Button, { props: { href: '/projects/new', children: textSnippet('+ New project') } });

    const link = screen.getByRole('link', { name: '+ New project' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/projects/new');
    expect(link.className).toMatch(/bg-accent-500/);
  });
});
