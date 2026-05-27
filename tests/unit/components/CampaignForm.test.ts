import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CampaignForm from '$lib/features/campaign-manager/ui/CampaignForm.svelte';

describe('CampaignForm', () => {
  it('posts to the create action with name and version fields', () => {
    render(CampaignForm);
    const form = screen.getByTestId('campaign-create-form');
    expect(form).toHaveAttribute('action', '?/create');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('App version')).toBeInTheDocument();
  });
});
