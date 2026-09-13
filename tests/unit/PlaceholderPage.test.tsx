import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaceholderPage } from '@/components/PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders the given title as a heading', () => {
    render(<PlaceholderPage title="Travel & Accommodation" />);
    expect(screen.getByRole('heading', { name: 'Travel & Accommodation' })).toBeInTheDocument();
  });
});
