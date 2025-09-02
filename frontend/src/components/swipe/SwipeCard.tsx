import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useFavorites } from "../../hooks/useFavorites";
import * as Sentry from "@sentry/nextjs";

interface SwipeCardProps {
  dog: {
    id?: number;
    name: string;
    breed?: string;
    age?: string;
    image?: string;
    organization?: string;
    location?: string;
    slug: string;
    description?: string;
    special_characteristic?: string;
    quality_score?: number;
    created_at?: string;
  };
  isStacked?: boolean;
}

const SwipeCardComponent = ({ dog, isStacked = false }: SwipeCardProps) => {
  const { addFavorite, isFavorited } = useFavorites();
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleFavorite = useCallback(async () => {
    if (!dog.id) return;
    
    setIsLiked(true);
    setShowHeartAnimation(true);
    
    await addFavorite(dog.id, dog.name);
    
    Sentry.captureEvent({
      message: "swipe.card.favorited_via_button",
      extra: {
        dogId: dog.id,
        dogName: dog.name,
      },
    });
    
    setTimeout(() => setShowHeartAnimation(false), 1000);
  }, [dog.id, dog.name, addFavorite]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/dogs/${dog.slug}`;
    const shareText = `Meet ${dog.name}! ${dog.description || `${dog.age || ''} ${dog.breed || ''} looking for a loving home`}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Meet ${dog.name}!`,
          text: shareText,
          url: shareUrl,
        });
        Sentry.captureEvent({
          message: "swipe.card.shared_native",
          extra: {
            dogId: dog.id,
            dogName: dog.name,
          },
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      Sentry.captureEvent({
        message: "swipe.card.shared_clipboard",
        extra: {
          dogId: dog.id,
          dogName: dog.name,
        },
      });
    }
  }, [dog]);

  const tagline = dog.description || (dog.age && dog.breed ? `${dog.age} ${dog.breed}` : '');

  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden relative"
      style={{ height: "calc(100vh - 280px)", maxHeight: "600px" }}
    >
      {/* Quick Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleShare}
          className="w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          aria-label="Share dog"
        >
          <span className="text-xl">📤</span>
        </button>
        <button
          onClick={handleFavorite}
          className={`w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${isLiked ? 'scale-125' : ''}`}
          aria-label="Add to favorites"
        >
          <span className={`text-xl ${showHeartAnimation ? 'animate-ping' : ''}`}>
            {isLiked ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* Main Image */}
      <div
        className="relative bg-gradient-to-br from-orange-400 to-orange-600"
        style={{ height: "60%" }}
        data-testid="image-container"
      >
        {dog.image ? (
          <Image
            src={dog.image}
            alt={`${dog.name} - adoptable dog`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white text-6xl">
            🐕
          </div>
        )}
      </div>

      {/* Essential Info Only */}
      <div className="p-4 sm:p-6" style={{ height: "40%" }}>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">{dog.name}</h2>
        
        {tagline && (
          <p className="text-gray-600 text-lg mb-3">
            {tagline}
          </p>
        )}

        {dog.special_characteristic && (
          <p className="text-gray-700 flex items-start gap-2">
            <span className="text-xl">✨</span>
            <span>{dog.special_characteristic}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export const SwipeCard = React.memo(SwipeCardComponent);