/**
 * Favorites management utility for persisting dog favorites in localStorage
 */

import { reportError } from './logger';

const STORAGE_KEY = 'rescue-dog-favorites';

// Helper to safely access localStorage
const getStorage = () => {
  // In tests, check for global mock first
  if (typeof global !== 'undefined' && global.localStorage) {
    return global.localStorage;
  }
  // In browser, use window.localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  // Fallback (should not happen in normal usage)
  throw new Error('localStorage not available');
};

export const FavoritesManager = {
  /**
   * Get all favorites from localStorage
   * @returns {Array} Array of favorite dog objects
   */
  getFavorites() {
    try {
      const storage = getStorage();
      const stored = storage.getItem(STORAGE_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch (error) {
      reportError('Error getting favorites', { error: error.message });
      return [];
    }
  },

  /**
   * Check if a dog is in favorites
   * @param {number|string} dogId - The dog ID to check
   * @returns {boolean} True if dog is in favorites
   */
  isFavorite(dogId) {
    const favorites = this.getFavorites();
    return favorites.some(fav => fav.id == dogId); // Use loose equality to handle string/number IDs
  },

  /**
   * Add a dog to favorites
   * @param {number|string} dogId - The dog ID
   * @param {Object} dogData - The dog data to store
   * @returns {Object} Result object with success status and message
   */
  addFavorite(dogId, dogData) {
    try {
      const favorites = this.getFavorites();
      
      // Check if already in favorites
      if (this.isFavorite(dogId)) {
        return {
          success: false,
          message: 'Already in favorites'
        };
      }

      // Add new favorite with timestamp
      const newFavorite = {
        ...dogData,
        id: dogId,
        addedAt: new Date().toISOString()
      };

      favorites.push(newFavorite);
      const storage = getStorage();
      storage.setItem(STORAGE_KEY, JSON.stringify(favorites));

      return {
        success: true,
        message: 'Added to favorites'
      };
    } catch (error) {
      reportError('Error adding favorite', { error: error.message, dogId });
      return {
        success: false,
        message: 'Failed to save favorite'
      };
    }
  },

  /**
   * Remove a dog from favorites
   * @param {number|string} dogId - The dog ID to remove
   * @returns {Object} Result object with success status and message
   */
  removeFavorite(dogId) {
    try {
      const favorites = this.getFavorites();
      const initialLength = favorites.length;
      
      const updatedFavorites = favorites.filter(fav => fav.id != dogId); // Use loose equality
      
      if (updatedFavorites.length === initialLength) {
        return {
          success: false,
          message: 'Not in favorites'
        };
      }

      const storage = getStorage();
      storage.setItem(STORAGE_KEY, JSON.stringify(updatedFavorites));

      return {
        success: true,
        message: 'Removed from favorites'
      };
    } catch (error) {
      reportError('Error removing favorite', { error: error.message, dogId });
      return {
        success: false,
        message: 'Failed to remove favorite'
      };
    }
  },

  /**
   * Clear all favorites
   */
  clearFavorites() {
    try {
      const storage = getStorage();
      storage.removeItem(STORAGE_KEY);
    } catch (error) {
      reportError('Error clearing favorites', { error: error.message });
    }
  },

  /**
   * Get the count of favorites
   * @returns {number} Number of favorites
   */
  getFavoriteCount() {
    return this.getFavorites().length;
  }
};