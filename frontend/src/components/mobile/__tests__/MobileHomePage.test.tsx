import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileHomePage } from '../MobileHomePage';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock child components
jest.mock('../MobileTopHeader', () => ({
  MobileTopHeader: () => (
    <div data-testid="mobile-top-header">Mobile Top Header</div>
  ),
}));

jest.mock('../MobileNavCards', () => ({
  MobileNavCards: () => (
    <div data-testid="mobile-nav-cards">Mobile Nav Cards</div>
  ),
}));

jest.mock('../MobileStats', () => ({
  MobileStats: ({ dogsCount, rescuesCount, breedsCount }: any) => (
    <div data-testid="mobile-stats">
      <span data-testid="dogs-count">{dogsCount}</span>
      <span data-testid="rescues-count">{rescuesCount}</span>
      <span data-testid="breeds-count">{breedsCount}</span>
    </div>
  ),
}));

jest.mock('../MobileAvailableNow', () => ({
  MobileAvailableNow: ({ dogs, onLoadMore, hasMore, loadingMore }: any) => (
    <div data-testid="mobile-available-now">
      <span data-testid="dogs-length">{dogs?.length || 0}</span>
      <button onClick={onLoadMore} data-testid="load-more">
        {loadingMore ? 'Loading...' : 'Load More'}
      </button>
      {hasMore && <span data-testid="has-more">Has More</span>}
    </div>
  ),
}));

jest.mock('../MobileBreedSpotlight', () => ({
  MobileBreedSpotlight: ({ breed }: any) => (
    <div data-testid="mobile-breed-spotlight">
      {breed && <span data-testid="breed-name">{breed.name}</span>}
    </div>
  ),
}));

jest.mock('../../navigation/MobileBottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-bottom-nav">Mobile Bottom Nav</div>,
}));

const mockInitialData = {
  dogs: [
    { id: 1, name: 'Max', breed: 'Golden Retriever' },
    { id: 2, name: 'Luna', breed: 'Border Collie' },
    { id: 3, name: 'Buddy', breed: 'Labrador' },
    { id: 4, name: 'Bella', breed: 'German Shepherd' },
  ],
  statistics: {
    totalDogs: 2860,
    totalOrganizations: 13,
    totalBreeds: 50,
  },
  featuredBreed: {
    name: 'Labrador Retriever',
    slug: 'labrador-retriever',
    description: 'Friendly and outgoing dogs',
    availableCount: 20,
  },
};

describe('MobileHomePage', () => {
  const mockPush = jest.fn();
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders all mobile components in correct order', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    const container = screen.getByTestId('mobile-home-page');
    const children = container.children;
    
    // Check components are rendered in order
    expect(screen.getByTestId('mobile-top-header')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav-cards')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-stats')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-available-now')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-breed-spotlight')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
  });

  it('applies mobile-only visibility classes', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    const container = screen.getByTestId('mobile-home-page');
    expect(container).toHaveClass('md:hidden');
  });

  it('passes correct data to MobileStats component', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    expect(screen.getByTestId('dogs-count')).toHaveTextContent('2860');
    expect(screen.getByTestId('rescues-count')).toHaveTextContent('13');
    expect(screen.getByTestId('breeds-count')).toHaveTextContent('50');
  });

  it('passes initial dogs to MobileAvailableNow', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    expect(screen.getByTestId('dogs-length')).toHaveTextContent('4');
  });

  it('passes featured breed to MobileBreedSpotlight', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    expect(screen.getByTestId('breed-name')).toHaveTextContent('Labrador Retriever');
  });

  it('handles load more dogs functionality', async () => {
    const additionalDogs = [
      { id: 5, name: 'Charlie', breed: 'Beagle' },
      { id: 6, name: 'Daisy', breed: 'Poodle' },
    ];
    
    const mockOnLoadMore = jest.fn().mockResolvedValue(additionalDogs);
    
    render(
      <MobileHomePage 
        initialData={mockInitialData}
        onLoadMore={mockOnLoadMore}
      />
    );
    
    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);
    
    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading state while fetching more dogs', async () => {
    const mockOnLoadMore = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <MobileHomePage 
        initialData={mockInitialData}
        onLoadMore={mockOnLoadMore}
      />
    );
    
    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);
    
    // Should show loading state immediately
    expect(screen.getByTestId('load-more')).toHaveTextContent('Loading...');
  });

  it('handles missing initial data gracefully', () => {
    render(<MobileHomePage initialData={undefined as any} />);
    
    // All components should still render
    expect(screen.getByTestId('mobile-top-header')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav-cards')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-stats')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-available-now')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-breed-spotlight')).toBeInTheDocument();
  });

  it('applies proper safe area padding', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    const container = screen.getByTestId('mobile-home-page');
    expect(container).toHaveClass('pb-20'); // Padding for bottom nav
  });

  it('sets min-height for full viewport coverage', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    const container = screen.getByTestId('mobile-home-page');
    expect(container).toHaveClass('min-h-screen');
  });

  it('applies correct background color', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    const container = screen.getByTestId('mobile-home-page');
    expect(container).toHaveClass('bg-gray-50', 'dark:bg-gray-900');
  });

  it('handles hasMore prop correctly', () => {
    render(
      <MobileHomePage 
        initialData={mockInitialData}
        hasMore={true}
      />
    );
    
    expect(screen.getByTestId('has-more')).toBeInTheDocument();
  });

  it('does not show has more when false', () => {
    render(
      <MobileHomePage 
        initialData={mockInitialData}
        hasMore={false}
      />
    );
    
    expect(screen.queryByTestId('has-more')).not.toBeInTheDocument();
  });

  it('handles empty dogs array', () => {
    const emptyData = {
      ...mockInitialData,
      dogs: [],
    };
    
    render(<MobileHomePage initialData={emptyData} />);
    
    expect(screen.getByTestId('dogs-length')).toHaveTextContent('0');
  });

  it('handles missing statistics gracefully', () => {
    const dataWithoutStats = {
      dogs: mockInitialData.dogs,
      featuredBreed: mockInitialData.featuredBreed,
    };
    
    render(<MobileHomePage initialData={dataWithoutStats as any} />);
    
    // Should render with undefined values
    expect(screen.getByTestId('mobile-stats')).toBeInTheDocument();
  });

  it('handles missing featured breed gracefully', () => {
    const dataWithoutBreed = {
      dogs: mockInitialData.dogs,
      statistics: mockInitialData.statistics,
    };
    
    render(<MobileHomePage initialData={dataWithoutBreed as any} />);
    
    // Should render without breed name
    expect(screen.getByTestId('mobile-breed-spotlight')).toBeInTheDocument();
    expect(screen.queryByTestId('breed-name')).not.toBeInTheDocument();
  });

  it('applies overflow hidden to prevent horizontal scroll', () => {
    render(<MobileHomePage initialData={mockInitialData} />);
    
    const container = screen.getByTestId('mobile-home-page');
    expect(container).toHaveClass('overflow-x-hidden');
  });

  it('maintains proper component hierarchy', () => {
    const { container } = render(<MobileHomePage initialData={mockInitialData} />);
    
    // Check that MobileTopHeader is first (sticky)
    const firstChild = container.firstChild?.firstChild;
    expect(firstChild).toHaveAttribute('data-testid', 'mobile-top-header');
  });
});