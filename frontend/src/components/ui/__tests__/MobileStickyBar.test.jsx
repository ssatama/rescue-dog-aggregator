import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider } from '../Toast';
import MobileStickyBar from '../MobileStickyBar';
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
  adoption_url: 'https://example.com/adopt/buddy',
  organization: 'Test Rescue',
  status: 'available'
};

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
});

describe('MobileStickyBar', () => {
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

  describe('Rendering', () => {
    test('renders mobile sticky bar with favorite and contact buttons', () => {
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const stickyBar = screen.getByTestId('mobile-sticky-bar');
      expect(stickyBar).toBeInTheDocument();
      expect(stickyBar).toHaveClass('md:hidden'); // Only visible on mobile

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      const contactButton = screen.getByTestId('mobile-contact-button');

      expect(favoriteButton).toBeInTheDocument();
      expect(contactButton).toBeInTheDocument();
      expect(favoriteButton).toHaveTextContent('Favorite');
      expect(contactButton).toHaveTextContent('Contact');
    });

    test('does not render when isVisible is false', () => {
      renderWithToast(<MobileStickyBar dog={mockDog} isVisible={false} />);

      expect(screen.queryByTestId('mobile-sticky-bar')).not.toBeInTheDocument();
    });

    test('does not render when dog is null', () => {
      renderWithToast(<MobileStickyBar dog={null} />);

      expect(screen.queryByTestId('mobile-sticky-bar')).not.toBeInTheDocument();
    });

    test('shows favorited state when dog is already in favorites', () => {
      FavoritesManager.isFavorite.mockReturnValue(true);
      
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      expect(favoriteButton).toHaveTextContent('Favorited');
      expect(favoriteButton).toHaveClass('bg-red-50', 'border-red-200', 'text-red-600');
    });
  });

  describe('Favorite functionality', () => {
    test('adds dog to favorites when not favorited', async () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      
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

    test('removes dog from favorites when favorited', async () => {
      FavoritesManager.isFavorite.mockReturnValue(true);
      
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.removeFavorite).toHaveBeenCalledWith(mockDog.id);
      });
    });

    test('shows correct button state after favorite action', async () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      expect(favoriteButton).toHaveTextContent('Favorite');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.addFavorite).toHaveBeenCalled();
      });

      // After successful operation, button should show favorited state
      expect(favoriteButton).toHaveTextContent('Favorited');
    });

    test('handles favorite operation failure', async () => {
      FavoritesManager.isFavorite.mockReturnValue(false);
      FavoritesManager.addFavorite.mockReturnValue({ success: false, message: 'Storage full' });
      
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      
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
      
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      
      act(() => {
        favoriteButton.click();
      });

      await waitFor(() => {
        expect(FavoritesManager.addFavorite).toHaveBeenCalled();
      });
    });
  });

  describe('Contact functionality', () => {
    test('opens adoption URL when contact button is clicked', () => {
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const contactButton = screen.getByTestId('mobile-contact-button');
      
      act(() => {
        contactButton.click();
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        mockDog.adoption_url,
        '_blank',
        'noopener,noreferrer'
      );
    });

    test('handles missing adoption URL', () => {
      const dogWithoutUrl = { ...mockDog, adoption_url: null };
      
      renderWithToast(<MobileStickyBar dog={dogWithoutUrl} />);

      const contactButton = screen.getByTestId('mobile-contact-button');
      
      act(() => {
        contactButton.click();
      });

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      const contactButton = screen.getByTestId('mobile-contact-button');

      expect(favoriteButton).toHaveAttribute('aria-label', 'Add to favorites');
      expect(contactButton).toHaveAttribute('aria-label', 'Contact about adoption');
    });

    test('updates ARIA label for favorited state', () => {
      FavoritesManager.isFavorite.mockReturnValue(true);
      
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const favoriteButton = screen.getByTestId('mobile-favorite-button');
      expect(favoriteButton).toHaveAttribute('aria-label', 'Remove from favorites');
    });
  });

  describe('Responsive design', () => {
    test('is hidden on larger screens', () => {
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const stickyBar = screen.getByTestId('mobile-sticky-bar');
      expect(stickyBar).toHaveClass('md:hidden');
    });

    test('is positioned at bottom of screen', () => {
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const stickyBar = screen.getByTestId('mobile-sticky-bar');
      expect(stickyBar).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
    });

    test('has proper z-index for overlay', () => {
      renderWithToast(<MobileStickyBar dog={mockDog} />);

      const stickyBar = screen.getByTestId('mobile-sticky-bar');
      expect(stickyBar).toHaveClass('z-50');
    });
  });

  describe('Custom styling', () => {
    test('applies custom className', () => {
      const customClass = 'custom-styling';
      renderWithToast(<MobileStickyBar dog={mockDog} className={customClass} />);

      const stickyBar = screen.getByTestId('mobile-sticky-bar');
      expect(stickyBar).toHaveClass(customClass);
    });
  });
});