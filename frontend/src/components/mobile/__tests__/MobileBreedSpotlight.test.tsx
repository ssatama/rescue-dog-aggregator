import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileBreedSpotlight } from '../MobileBreedSpotlight';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Next Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

// Mock lucide icons
jest.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="chevron-icon">→</span>,
  Dog: () => <span data-testid="dog-icon">🐕</span>,
  Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
}));

const mockBreedData = {
  name: 'Labrador Retriever',
  description: 'Friendly, outgoing, and active dogs who love families and make perfect companions.',
  availableCount: 20,
  imageUrl: '/images/breeds/labrador.jpg',
  slug: 'labrador-retriever',
};

describe('MobileBreedSpotlight', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders the component with correct structure', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    // Check heading
    expect(screen.getByText('Breed Spotlight')).toBeInTheDocument();
    
    // Check breed name
    expect(screen.getByText('Labrador Retriever')).toBeInTheDocument();
    
    // Check description
    expect(screen.getByText(/Friendly, outgoing, and active dogs/)).toBeInTheDocument();
    
    // Check available count
    expect(screen.getByText('20 available')).toBeInTheDocument();
    
    // Check CTA button
    expect(screen.getByRole('button', { name: /explore labradors/i })).toBeInTheDocument();
  });

  it('applies mobile-only visibility classes', () => {
    const { container } = render(<MobileBreedSpotlight breed={mockBreedData} />);
    const section = container.firstChild;
    expect(section).toHaveClass('md:hidden');
  });

  it('applies gradient background classes', () => {
    const { container } = render(<MobileBreedSpotlight breed={mockBreedData} />);
    const card = screen.getByTestId('breed-spotlight-card');
    expect(card).toHaveClass('bg-gradient-to-br', 'from-violet-600', 'via-indigo-600', 'to-blue-600');
  });

  it('renders breed image when provided', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    const image = screen.getByAltText('Labrador Retriever');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/images/breeds/labrador.jpg');
  });

  it('renders placeholder when no image provided', () => {
    const breedWithoutImage = { ...mockBreedData, imageUrl: undefined };
    render(<MobileBreedSpotlight breed={breedWithoutImage} />);
    
    // Should show dog icon placeholder
    expect(screen.getByTestId('dog-icon')).toBeInTheDocument();
  });

  it('navigates to breed page when CTA button is clicked', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    const ctaButton = screen.getByRole('button', { name: /explore labradors/i });
    fireEvent.click(ctaButton);
    
    expect(mockPush).toHaveBeenCalledWith('/breeds/labrador-retriever');
  });

  it('handles missing breed data gracefully', () => {
    render(<MobileBreedSpotlight breed={undefined} />);
    
    // Should show loading/fallback state
    expect(screen.getByText('Breed Spotlight')).toBeInTheDocument();
    expect(screen.getByText('Discover Popular Breeds')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore.*breeds/i })).toBeInTheDocument();
  });

  it('displays loading skeleton when loading prop is true', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} loading={true} />);
    
    expect(screen.getByTestId('breed-spotlight-skeleton')).toBeInTheDocument();
  });

  it('navigates to general breeds page when no breed slug', () => {
    const breedWithoutSlug = { ...mockBreedData, slug: undefined };
    render(<MobileBreedSpotlight breed={breedWithoutSlug} />);
    
    const ctaButton = screen.getByRole('button', { name: /explore labradors/i });
    fireEvent.click(ctaButton);
    
    expect(mockPush).toHaveBeenCalledWith('/breeds');
  });

  it('truncates long breed descriptions', () => {
    const longDescription = 'A'.repeat(200);
    const breedWithLongDesc = { ...mockBreedData, description: longDescription };
    render(<MobileBreedSpotlight breed={breedWithLongDesc} />);
    
    const description = screen.getByTestId('breed-description');
    expect(description).toHaveClass('line-clamp-3');
  });

  it('formats breed name correctly for CTA button', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    // Should use "Labradors" (plural) in the button
    expect(screen.getByRole('button', { name: /explore labradors/i })).toBeInTheDocument();
  });

  it('handles breeds with single-word names', () => {
    const singleWordBreed = { ...mockBreedData, name: 'Beagle' };
    render(<MobileBreedSpotlight breed={singleWordBreed} />);
    
    expect(screen.getByRole('button', { name: /explore beagles/i })).toBeInTheDocument();
  });

  it('shows sparkles icon for decoration', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    // Check section role
    const section = screen.getByRole('region', { name: /breed spotlight/i });
    expect(section).toBeInTheDocument();
    
    // Check button has proper aria-label
    const ctaButton = screen.getByRole('button', { name: /explore labradors/i });
    expect(ctaButton).toHaveAttribute('aria-label');
  });

  it('applies hover effect classes to CTA button', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    const ctaButton = screen.getByRole('button', { name: /explore labradors/i });
    expect(ctaButton).toHaveClass('hover:bg-white', 'transition-all');
  });

  it('renders with proper padding and spacing', () => {
    const { container } = render(<MobileBreedSpotlight breed={mockBreedData} />);
    const section = container.firstChild;
    
    expect(section).toHaveClass('px-4', 'py-6');
  });

  it('displays count badge with correct styling', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    const badge = screen.getByText('20 available');
    expect(badge).toHaveClass('bg-white/20', 'backdrop-blur-sm');
  });

  it('handles zero available count', () => {
    const breedWithNoAvailable = { ...mockBreedData, availableCount: 0 };
    render(<MobileBreedSpotlight breed={breedWithNoAvailable} />);
    
    // Should not show the count badge when 0
    expect(screen.queryByText('0 available')).not.toBeInTheDocument();
  });

  it('applies animation classes', () => {
    render(<MobileBreedSpotlight breed={mockBreedData} />);
    
    const card = screen.getByTestId('breed-spotlight-card');
    expect(card).toHaveClass('motion-safe:animate-fadeInUp');
  });
});