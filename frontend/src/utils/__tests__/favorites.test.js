import { FavoritesManager } from '../favorites';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Properly assign the mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('FavoritesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations to defaults
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});
  });

  describe('getFavorites', () => {
    test('returns empty array when no favorites exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const favorites = FavoritesManager.getFavorites();
      
      expect(favorites).toEqual([]);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('rescue-dog-favorites');
    });

    test('returns parsed favorites from localStorage', () => {
      const mockFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' },
        { id: 2, name: 'Max', addedAt: '2024-01-02T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFavorites));
      
      const favorites = FavoritesManager.getFavorites();
      
      expect(favorites).toEqual(mockFavorites);
    });

    test('returns empty array when localStorage contains invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      const favorites = FavoritesManager.getFavorites();
      
      expect(favorites).toEqual([]);
    });
  });

  describe('isFavorite', () => {
    test('returns true when dog is in favorites', () => {
      const mockFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' },
        { id: 2, name: 'Max', addedAt: '2024-01-02T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFavorites));
      
      const isFav = FavoritesManager.isFavorite(1);
      
      expect(isFav).toBe(true);
    });

    test('returns false when dog is not in favorites', () => {
      const mockFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFavorites));
      
      const isFav = FavoritesManager.isFavorite(2);
      
      expect(isFav).toBe(false);
    });

    test('returns false when no favorites exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const isFav = FavoritesManager.isFavorite(1);
      
      expect(isFav).toBe(false);
    });

    test('handles string IDs correctly', () => {
      const mockFavorites = [
        { id: '1', name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFavorites));
      
      expect(FavoritesManager.isFavorite('1')).toBe(true);
      expect(FavoritesManager.isFavorite(1)).toBe(true); // Should work with number too
    });
  });

  describe('addFavorite', () => {
    test('adds new favorite to empty list', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const dogData = { id: 1, name: 'Buddy', breed: 'Golden Retriever' };
      
      const result = FavoritesManager.addFavorite(1, dogData);
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'rescue-dog-favorites',
        expect.stringContaining('"id":1')
      );
      
      // Verify the stored data structure
      const setItemCall = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData).toHaveLength(1);
      expect(storedData[0]).toMatchObject({
        id: 1,
        name: 'Buddy',
        breed: 'Golden Retriever'
      });
      expect(storedData[0].addedAt).toBeDefined();
    });

    test('adds favorite to existing list', () => {
      const existingFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      const dogData = { id: 2, name: 'Max', breed: 'Labrador' };
      const result = FavoritesManager.addFavorite(2, dogData);
      
      expect(result.success).toBe(true);
      
      const setItemCall = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData).toHaveLength(2);
      expect(storedData[1]).toMatchObject({
        id: 2,
        name: 'Max',
        breed: 'Labrador'
      });
    });

    test('does not add duplicate favorite', () => {
      const existingFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      const dogData = { id: 1, name: 'Buddy', breed: 'Golden Retriever' };
      const result = FavoritesManager.addFavorite(1, dogData);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Already in favorites');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const dogData = { id: 1, name: 'Buddy' };
      const result = FavoritesManager.addFavorite(1, dogData);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to save favorite');
    });
  });

  describe('removeFavorite', () => {
    test('removes favorite from list', () => {
      const existingFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' },
        { id: 2, name: 'Max', addedAt: '2024-01-02T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      const result = FavoritesManager.removeFavorite(1);
      
      expect(result.success).toBe(true);
      
      const setItemCall = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData).toHaveLength(1);
      expect(storedData[0].id).toBe(2);
    });

    test('handles removing non-existent favorite', () => {
      const existingFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      const result = FavoritesManager.removeFavorite(999);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Not in favorites');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('removes last favorite and stores empty array', () => {
      const existingFavorites = [
        { id: 1, name: 'Buddy', addedAt: '2024-01-01T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      const result = FavoritesManager.removeFavorite(1);
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('rescue-dog-favorites', '[]');
    });
  });

  describe('clearFavorites', () => {
    test('clears all favorites', () => {
      FavoritesManager.clearFavorites();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('rescue-dog-favorites');
    });
  });

  describe('getFavoriteCount', () => {
    test('returns correct count of favorites', () => {
      const mockFavorites = [
        { id: 1, name: 'Buddy' },
        { id: 2, name: 'Max' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFavorites));
      
      const count = FavoritesManager.getFavoriteCount();
      
      expect(count).toBe(2);
    });

    test('returns 0 when no favorites exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const count = FavoritesManager.getFavoriteCount();
      
      expect(count).toBe(0);
    });
  });
});