"use client";

import { useState, useEffect } from 'react';
import { Button } from "./button";
import { Icon } from './Icon';
import { FavoritesManager } from '../../utils/favorites';
import { useToast } from './Toast';
import { reportError } from '../../utils/logger';

interface Dog {
  id: string | number;
  name: string;
  breed?: string;
  standardized_breed?: string;
  primary_image_url?: string;
  organization?: string;
  status?: string;
  adoption_url?: string;
}

interface MobileStickyBarProps {
  dog: Dog;
  isVisible?: boolean;
  className?: string;
}

export default function MobileStickyBar({ 
  dog, 
  isVisible = true, 
  className = "" 
}: MobileStickyBarProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Initialize favorite status
  useEffect(() => {
    if (dog?.id) {
      setIsFavorite(FavoritesManager.isFavorite(dog.id));
    }
  }, [dog?.id]);

  const handleFavoriteToggle = async (): Promise<void> => {
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
      reportError('Error toggling favorite', { error: (error as Error).message, dogId: dog?.id });
      showToast('Failed to update favorites', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactClick = (): void => {
    if (dog?.adoption_url) {
      // Open the adoption URL
      window.open(dog.adoption_url, '_blank', 'noopener,noreferrer');
      showToast('Opening adoption page...', 'info');
    } else {
      showToast('Contact information not available', 'error');
    }
  };

  if (!isVisible || !dog) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden ${className}`}
      data-testid="mobile-sticky-bar"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Favorite Button */}
        <Button
          variant="outline"
          size="lg"
          onClick={handleFavoriteToggle}
          disabled={isLoading}
          className={`flex-1 mr-2 ${
            isFavorite 
              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
              : 'hover:bg-gray-50'
          }`}
          data-testid="mobile-favorite-button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Icon 
            name="heart"
            size="default"
            filled={isFavorite}
            className={`mr-2 ${
              isFavorite ? 'text-red-500' : ''
            }`} 
          />
          {isLoading ? 'Saving...' : (isFavorite ? 'Favorited' : 'Favorite')}
        </Button>

        {/* Contact/Adopt Button */}
        <Button
          size="lg"
          onClick={handleContactClick}
          className="flex-1 ml-2 bg-orange-600 hover:bg-orange-700 text-white mobile-touch-target"
          data-testid="mobile-contact-button"
          aria-label="Start adoption process"
        >
          <Icon name="phone" size="default" className="mr-2" />
          Start Adoption Process
        </Button>
      </div>
      
      {/* Bottom safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-white"></div>
    </div>
  );
}