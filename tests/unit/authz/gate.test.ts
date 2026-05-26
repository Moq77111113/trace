import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Gate from '$lib/shared/authz/Gate.svelte';

const pageState = vi.hoisted(() => ({ data: { capabilities: [] as string[] } }));
vi.mock('$app/state', () => ({ page: pageState }));

const child = createRawSnippet(() => ({
  render: () => `<button data-testid="control">Edit</button>`,
}));

describe('Gate', () => {
  beforeEach(() => { pageState.data.capabilities = []; });

  it('renders the child when the verb is granted', () => {
    pageState.data.capabilities = ['feature.author'];
    const { getByTestId } = render(Gate, { can: 'feature.author', children: child });
    expect(getByTestId('control')).toBeInTheDocument();
  });

  it('renders nothing when forbidden and hiding (default)', () => {
    const { queryByTestId, container } = render(Gate, { can: 'feature.author', children: child });
    expect(queryByTestId('control')).toBeNull();
    expect(container.querySelector('fieldset')).toBeNull();
  });

  it('renders a disabled fieldset with the tooltip when forbidden and disable=true', () => {
    const { container } = render(Gate, { can: 'feature.author', disable: true, children: child });
    const fs = container.querySelector('fieldset');
    expect(fs).not.toBeNull();
    expect(fs).toBeDisabled();
    expect(fs).toHaveAttribute('title');
  });
});
