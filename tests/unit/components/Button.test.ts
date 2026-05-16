import { describe, it, expect } from 'vitest';
import { render, screen }       from '@testing-library/svelte';
import { createRawSnippet }     from 'svelte';
import Button                   from '$lib/components/ui/Button.svelte';

const textSnippet = (text: string) =>
  createRawSnippet(() => ({ render: () => text }));

describe('Button', () => {
  it('applies the danger variant', () => {
    render(Button, { props: { variant: 'danger', children: textSnippet('Delete') } });

    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/text-fail-ink/);
  });

  it('forwards disabled to the underlying button', () => {
    render(Button, { props: { disabled: true, children: textSnippet('Save') } });

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as an anchor when href is provided', () => {
    render(Button, {
      props: { href: '/projects/new', variant: 'primary', children: textSnippet('+ New project') }
    });

    const link = screen.getByRole('link', { name: '+ New project' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/projects/new');
    expect(link.className).toMatch(/bg-accent/);
  });
});
