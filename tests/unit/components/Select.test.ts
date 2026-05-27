import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Select from '$lib/shared/ui/Select.svelte';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

describe('Select', () => {
  it('exposes the trigger as a combobox', () => {
    render(Select, { props: { value: 'a', onValueChange: () => {}, options } });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('exposes each open option with role="option"', async () => {
    render(Select, { props: { value: 'a', onValueChange: () => {}, options } });

    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await fireEvent.keyDown(trigger, { key: 'Enter' });

    const rendered = await screen.findAllByRole('option');
    expect(rendered).toHaveLength(options.length);
    expect(rendered.map((el) => el.textContent?.trim())).toEqual(['Alpha', 'Beta']);
  });
});
