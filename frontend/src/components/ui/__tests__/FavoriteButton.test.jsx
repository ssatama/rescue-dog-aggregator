import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider } from '../Toast';
import FavoriteButton from '../FavoriteButton';
import { FavoritesManager } from '../../../utils/favorites';

// Mock the FavoritesManager
jest.mock('../../../utils/favorites', () => ({
  FavoritesManager: {
    isFavorite: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
  }
}));

const mockDog = {
  id: 1,
  name: 'Buddy',
  breed: 'Golden Retriever',
  standardized_breed: 'Golden Retriever',
  primary_image_url: 'https://example.com/buddy.jpg',
  organization: 'Test Rescue',
  status: 'available'
};

describe('FavoriteButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    FavoritesManager.isFavorite.mockReturnValue(false);
    FavoritesManager.addFavorite.mockReturnValue({ success: true, message: 'Added to favorites' });
    FavoritesManager.removeFavorite.mockReturnValue({ success: true, message: 'Removed from favorites' });
  });

  const renderWithToast = (component) => {
    return render(
      <ToastProvider>
        {component}
      </ToastProvider>
    );
  };

  describe('Header variant', () => {
    test('renders favorite button with heart icon', () => {
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveAttribute('aria-label', 'Add to favorites');
    });

    test('shows unfavorited state by default', () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      const heartIcon = favoriteButton.querySelector('svg');
      
      expect(heartIcon).toHaveClass('text-gray-600');
      expect(heartIcon).not.toHaveClass('fill-current');
      expect(favoriteButton).toHaveAttribute('aria-label', 'Add to favorites');
    });

    test('shows favorited state when dog is in favorites', () => {
      FavoritesManager.isFavorite.mockReturnValue(true);
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      const heartIcon = favoriteButton.querySelector('svg');
      
      expect(heartIcon).toHaveClass('text-red-500', 'fill-current');
      expect(favoriteButton).toHaveAttribute('aria-label', 'Remove from favorites');
    });

    test('adds dog to favorites when clicked', async () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.addFavorite).toHaveBeenCalledWith(mockDog.id, {
          id: mockDog.id,
          name: mockDog.name,
          breed: mockDog.standardized_breed,
          primary_image_url: mockDog.primary_image_url,
          organization: mockDog.organization,
          status: mockDog.status
        });
      });
    });

    test('removes dog from favorites when favorited and clicked', async () => {
      FavoritesManager.isFavorite.mockReturnValue(true);
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.removeFavorite).toHaveBeenCalledWith(mockDog.id);
      });
    });

    test('handles favorite operation failure', async () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      FavoritesManager.addFavorite.mockReturnValue({ success: false, message: 'Storage full' });
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.addFavorite).toHaveBeenCalled();
      });
    });

    test('handles favorite operation error', async () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      FavoritesManager.addFavorite.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.addFavorite).toHaveBeenCalled();
      });
    });

    test('shows visual feedback for successful operation', async () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      let heartIcon = favoriteButton.querySelector('svg');
      
      // Initially unfavorited
      expect(heartIcon).toHaveClass('text-gray-600');
      expect(heartIcon).not.toHaveClass('fill-current');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.addFavorite).toHaveBeenCalled();
      });

      // After successful operation, should show favorited state
      heartIcon = favoriteButton.querySelector('svg');
      expect(heartIcon).toHaveClass('text-red-500', 'fill-current');
    });

    test('does not render for invalid dog', () => {
      renderWithToast(<FavoriteButton dog={null} variant="header" />);

      expect(screen.queryByTestId('header-favorite-button')).toBeInTheDocument();
      // Button should render but not function without dog.id
    });

    test('applies custom className', () => {
      const customClass = 'custom-styling';
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" className={customClass} />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      expect(favoriteButton).toHaveClass(customClass);
    });
  });

  describe('Other variants', () => {
    test('returns null for unknown variant', () => {
      const { container } = renderWithToast(<FavoriteButton dog={mockDog} variant="unknown" />);
      expect(container.firstChild).toBeNull();
    });

    test('defaults to header variant when not specified', () => {
      renderWithToast(<FavoriteButton dog={mockDog} />);
      expect(screen.getByTestId('header-favorite-button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA label for unfavorited state', () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      expect(favoriteButton).toHaveAttribute('aria-label', 'Add to favorites');
    });

    test('has proper ARIA label for favorited state', () => {
      FavoritesManager.isFavorite.mockReturnValue(true);
      
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const favoriteButton = screen.getByTestId('header-favorite-button');
      expect(favoriteButton).toHaveAttribute('aria-label', 'Remove from favorites');
    });

    test('heart icon has aria-hidden attribute', () => {
      renderWithToast(<FavoriteButton dog={mockDog} variant="header" />);

      const heartIcon = screen.getByTestId('header-favorite-button').querySelector('svg');
      expect(heartIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});