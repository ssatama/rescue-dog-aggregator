import { render, screen } from '@testing-library/react';
import Header from '../Header';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/guides'),
}));

// Mock dependencies
jest.mock('../../ui/Icon', () => ({
  Icon: ({ name }) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

jest.mock('../../ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

jest.mock('../../favorites/FavoriteBadge', () => ({
  FavoriteBadge: () => <span data-testid="favorite-badge">0</span>,
}));

describe('Header - Guides Navigation', () => {
  it('renders Guides link in desktop navigation', () => {
    render(<Header />);
    const guidesLinks = screen.getAllByText('Guides');
    expect(guidesLinks.length).toBeGreaterThan(0);
  });

  it('shows active underline when on /guides', () => {
    render(<Header />);
    const underline = screen.getByTestId('nav-underline-guides');
    expect(underline).toBeInTheDocument();
    expect(underline).toHaveClass('bg-orange-600');
  });

  it('applies active styling to Guides link', () => {
    render(<Header />);
    const guidesLinks = screen.getAllByText('Guides');
    const desktopLink = guidesLinks[0].closest('a');
    expect(desktopLink).toHaveClass('text-orange-600');
  });
});
