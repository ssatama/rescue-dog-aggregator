"use client";

import { useState, useEffect } from 'react';
import { FavoritesManager } from '../../utils/favorites';
import { useToast } from './Toast';
import { reportError } from '../../utils/logger';
import { Icon } from './Icon';

export default function FavoriteButton({ 
  dog, 
  variant = "header", // "header" or "mobile"
  className = "" 
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Initialize favorite status
  useEffect(() => {
    if (dog?.id) {
      setIsFavorite(FavoritesManager.isFavorite(dog.id));
    }
  }, [dog?.id]);

  const handleFavoriteToggle = async () => {
    if (!dog?.id || isLoading) return;
    
    setIsLoading(true);
    
    try {
      let result;
      if (isFavorite) {
        result = FavoritesManager.removeFavorite(dog.id);
        if (result.success) {
          setIsFavorite(false);
          showToast(`${dog.name} removed from favorites`, 'info');
        }
      } else {
        const dogData = {
          id: dog.id,
          name: dog.name,
          breed: dog.standardized_breed || dog.breed,
          primary_image_url: dog.primary_image_url,
          organization: dog.organization,
          status: dog.status
        };
        result = FavoritesManager.addFavorite(dog.id, dogData);
        if (result.success) {
          setIsFavorite(true);
          showToast(`${dog.name} added to favorites!`, 'success');
        }
      }
      
      if (!result.success) {
        showToast(result.message || 'Something went wrong', 'error');
      }
    } catch (error) {
      reportError('Error toggling favorite', { error: error.message, dogId: dog?.id });
      showToast('Failed to update favorites', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "header") {
    return (
      <button 
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${className}`}
        onClick={handleFavoriteToggle}
        disabled={isLoading}
        data-testid="header-favorite-button"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Icon 
          name="heart"
          size="medium"
          filled={isFavorite}
          className={`transition-colors ${
            isFavorite 
              ? 'text-red-500' 
              : 'text-gray-600 hover:text-red-500'
          } ${isLoading ? 'opacity-50' : ''}`}
        />
      </button>
    );
  }

  // For other variants, return null for now (can be extended later)
  return null;
}