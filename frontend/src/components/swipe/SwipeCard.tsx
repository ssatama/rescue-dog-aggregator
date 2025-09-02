import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useFavorites } from "../../hooks/useFavorites";
import * as Sentry from "@sentry/nextjs";
import { Share2 } from "lucide-react";

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
    dogProfilerData?: {
      tagline?: string;
      uniqueQuirk?: string;
      personalityTraits?: string[];
      favoriteActivities?: string[];
      engagement_score?: number;
      quality_score?: number;
    };
  };
  isStacked?: boolean;
}

const SwipeCardComponent = ({ dog, isStacked = false }: SwipeCardProps) => {
  const { addFavorite, isFavorited } = useFavorites();
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
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
    },
    [dog.id, dog.name, addFavorite],
  );

  const copyToClipboard = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      Sentry.captureEvent({
        message: "swipe.card.shared",
        level: "info",
        extra: {
          dog_id: dog.id,
          dog_name: dog.name,
          method: "clipboard",
        },
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }, [dog.id, dog.name]);

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const shareTitle = `Check out ${dog.name} for adoption!`;
      const shareText =
        dog.description ||
        `${dog.name} is a ${dog.age || ""} ${dog.breed || ""} looking for a forever home!`;
      const shareUrl = `https://www.rescuedogs.me/dog/${dog.id}`;

      try {
        // Check if Web Share API is available and we're in a secure context
        if (navigator.share && window.isSecureContext) {
          try {
            await navigator.share({
              title: shareTitle,
              text: shareText,
              url: shareUrl,
            });
            Sentry.captureEvent({
              message: "swipe.card.shared",
              level: "info",
              extra: {
                dog_id: dog.id,
                dog_name: dog.name,
                method: "web_share_api",
              },
            });
          } catch (error) {
            // User cancelled or error occurred, fall back to clipboard
            if ((error as Error).name !== "AbortError") {
              await copyToClipboard(shareUrl);
            }
          }
        } else {
          // Fallback to clipboard copy
          await copyToClipboard(shareUrl);
        }
      } catch (error) {
        console.error("Share failed:", error);
        // Final fallback - just copy to clipboard
        await copyToClipboard(shareUrl);
      }
    },
    [dog, copyToClipboard],
  );


  // Access enriched LLM data
  const profileData = dog.dogProfilerData || {};
  const tagline = profileData.tagline || "";
  const uniqueQuirk = profileData.uniqueQuirk || "";
  const personalityTraits = profileData.personalityTraits || [];
  const favoriteActivities = profileData.favoriteActivities || [];

  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden relative h-full"
      style={{ minHeight: "400px", maxHeight: "600px" }}
    >
      {/* Quick Action Buttons */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex gap-2">
        <button
          onClick={handleShare}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          aria-label="Share dog"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={handleFavorite}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${isLiked ? "scale-125" : ""}`}
          aria-label="Add to favorites"
        >
          <span
            className={`text-lg sm:text-xl ${showHeartAnimation ? "animate-ping" : ""}`}
          >
            {isLiked ? "❤️" : "🤍"}
          </span>
        </button>
      </div>

      {/* Main Image */}
      <div
        className="relative bg-gradient-to-br from-orange-400 to-orange-600"
        style={{ height: "55%" }}
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

      {/* Essential Info with Enriched Data */}
      <div
        className="p-3 sm:p-4 md:p-6 flex flex-col"
        style={{ height: "45%" }}
      >
        {/* Always show name as fallback */}
        <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">
          About {dog.name}
        </h3>

        {/* Tagline */}
        {tagline && (
          <p className="text-sm sm:text-base font-medium text-gray-800 mb-2 line-clamp-2">
            {tagline}
          </p>
        )}

        {/* Personality Traits */}
        {personalityTraits.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {personalityTraits.slice(0, 3).map((trait, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Interests/Activities */}
        {favoriteActivities.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">❤️</span>
            <span className="text-xs text-gray-600">
              Loves: {favoriteActivities.slice(0, 2).join(", ")}
            </span>
          </div>
        )}

        {/* What Makes Me Special */}
        {uniqueQuirk && (
          <div className="mt-auto pt-2 border-t border-gray-100">
            <p className="text-xs sm:text-sm text-gray-700 flex items-start gap-2">
              <span className="text-base">✨</span>
              <span className="line-clamp-2">{uniqueQuirk}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const SwipeCard = React.memo(SwipeCardComponent);
