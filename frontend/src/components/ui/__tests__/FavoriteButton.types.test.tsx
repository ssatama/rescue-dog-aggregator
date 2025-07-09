import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FavoriteButton, { Dog, FavoriteButtonVariant } from '../FavoriteButton';
import { ToastProvider } from '../Toast';
import { FavoritesManager } from '../../../utils/favorites';

// Mock the dependencies
jest.mock('../../../utils/favorites');
jest.mock('../../../utils/logger');

const mockFavoritesManager = FavoritesManager as jest.Mocked<typeof FavoritesManager>;

// Helper to render with ToastProvider
const renderWithToast = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('FavoriteButton TypeScript Tests', () => {
  const mockDog: Dog = {
    id: 1,
    name: 'Buddy',
    breed: 'Golden Retriever',
    standardized_breed: 'Golden Retriever',
    primary_image_url: 'https://example.com/dog.jpg',
    organization: { id: 1, name: 'Test Org' },
    status: 'available'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFavoritesManager.isFavorite.mockReturnValue(false);
    mockFavoritesManager.addFavorite.mockReturnValue({ success: true, message: 'Added' });
    mockFavoritesManager.removeFavorite.mockReturnValue({ success: true, message: 'Removed' });
  });

  test('accepts properly typed Dog interface', () => {
    renderWithToast(
      <FavoriteButton dog={mockDog} />
    );
    
    const button = screen.getByTestId('header-favorite-button');
    expect(button).toBeInTheDocument();
  });

  test('accepts all valid variant types', () => {
    const variants: FavoriteButtonVariant[] = ['header', 'mobile'];
    
    variants.forEach(variant => {
      const { unmount } = renderWithToast(
        <FavoriteButton dog={mockDog} variant={variant} />
      );
      
      if (variant === 'header') {
        expect(screen.getByTestId('header-favorite-button')).toBeInTheDocument();
      }
      
      unmount();
    });
  });

  test('handles minimal Dog interface', () => {
    const minimalDog: Dog = {
      id: 2,
      name: 'Minimal Dog'
    };
    
    renderWithToast(
      <FavoriteButton dog={minimalDog} />
    );
    
    const button = screen.getByTestId('header-favorite-button');
    expect(button).toBeInTheDocument();
  });

  test('accepts optional className prop', () => {
    const className = 'custom-favorite-button';
    
    renderWithToast(
      <FavoriteButton dog={mockDog} className={className} />
    );
    
    const button = screen.getByTestId('header-favorite-button');
    expect(button).toHaveClass(className);
  });

  test('handles optional variant prop', () => {
    renderWithToast(
      <FavoriteButton dog={mockDog} />
    );
    
    // Should default to header variant
    const button = screen.getByTestId('header-favorite-button');
    expect(button).toBeInTheDocument();
  });

  test('properly types async handleFavoriteToggle function', async () => {
    renderWithToast(
      <FavoriteButton dog={mockDog} />
    );
    
    const button = screen.getByTestId('header-favorite-button');
    fireEvent.click(button);
    
    expect(mockFavoritesManager.addFavorite).toHaveBeenCalledWith(
      mockDog.id,
      expect.objectContaining({
        id: mockDog.id,
        name: mockDog.name,
        breed: mockDog.standardized_breed || mockDog.breed,
        primary_image_url: mockDog.primary_image_url,
        organization: mockDog.organization,
        status: mockDog.status
      })
    );
  });

  test('handles error catching with proper types', async () => {
    mockFavoritesManager.addFavorite.mockImplementation(() => {
      throw new Error('Test error');
    });

    renderWithToast(
      <FavoriteButton dog={mockDog} />
    );
    
    const button = screen.getByTestId('header-favorite-button');
    fireEvent.click(button);
    
    // Should not throw and should handle error gracefully
    expect(button).toBeInTheDocument();
  });

  test('properly types component props interface', () => {
    const props = {
      dog: mockDog,
      variant: 'header' as FavoriteButtonVariant,
      className: 'test-class'
    };
    
    renderWithToast(<FavoriteButton {...props} />);
    
    const button = screen.getByTestId('header-favorite-button');
    expect(button).toHaveClass('test-class');
  });
});