"use client";

import { useState, useEffect } from 'react';
import { FavoritesManager } from '../../utils/favorites';
import { useToast } from './Toast';
import { reportError } from '../../utils/logger';

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
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
        onClick={handleFavoriteToggle}
        disabled={isLoading}
        data-testid="header-favorite-button"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <svg 
          className={`w-6 h-6 transition-colors ${
            isFavorite 
              ? 'text-red-500 fill-current' 
              : 'text-gray-600 hover:text-red-500'
          } ${isLoading ? 'opacity-50' : ''}`}
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      </button>
    );
  }

  // For other variants, return null for now (can be extended later)
  return null;
}