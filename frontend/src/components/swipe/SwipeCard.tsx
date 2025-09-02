import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useFavorites } from "../../hooks/useFavorites";
import * as Sentry from "@sentry/nextjs";
import { Share2 } from "lucide-react";
import { getPersonalityTraitColor } from "../../utils/personalityColors";

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

  const copyToClipboard = useCallback(
    async (url: string) => {
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
    },
    [dog.id, dog.name],
  );

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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 overflow-hidden relative group transition-colors flex flex-col">
      {/* NEW Badge for recent dogs */}
      {dog.created_at &&
        new Date().getTime() - new Date(dog.created_at).getTime() <
          7 * 24 * 60 * 60 * 1000 && (
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
              NEW
            </span>
          </div>
        )}

      {/* Quick Action Buttons */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex gap-2">
        <button
          onClick={handleShare}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-all"
          aria-label="Share dog"
        >
          <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={handleFavorite}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-all ${isLiked ? "scale-125" : ""}`}
          aria-label="Add to favorites"
        >
          <span
            className={`text-lg sm:text-xl ${showHeartAnimation ? "animate-ping" : ""}`}
          >
            {isLiked ? "❤️" : "🤍"}
          </span>
        </button>
      </div>

      {/* Main Image - Mobile optimized with 4:3 aspect ratio */}
      <div
        className="relative aspect-[4/3] bg-gradient-to-br from-orange-400 to-orange-600 overflow-hidden rounded-t-2xl flex-shrink-0"
        data-testid="image-container"
      >
        {dog.image ? (
          <Image
            src={dog.image}
            alt={`${dog.name} - adoptable dog`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            style={{ objectPosition: "center 30%" }}
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white text-6xl">
            🐕
          </div>
        )}
      </div>

      {/* Essential Info with Enriched Data */}
      <div className="p-6 flex flex-col space-y-4 dark:bg-gray-800 overflow-y-auto flex-1">
        {/* Primary info: Name, Age, Breed */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {dog.name}
          </h3>
          {(dog.age || dog.breed) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {[dog.age, dog.breed].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>

        {/* Tagline */}
        {tagline && (
          <p className="italic text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
            {tagline}
          </p>
        )}

        {/* Top 3 Personality Traits with consistent colors */}
        {personalityTraits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {personalityTraits.slice(0, 3).map((trait, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${getPersonalityTraitColor(trait)}`}
              >
                {trait.charAt(0).toUpperCase() + trait.slice(1)}
              </span>
            ))}
          </div>
        )}

        {/* Energy Level Indicator - Visual bars */}
        {dog.dogProfilerData?.engagement_score && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Energy:
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-2 w-6 rounded-full ${
                    level <= (dog.dogProfilerData?.engagement_score || 0) / 20
                      ? "bg-orange-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* What Makes Me Special */}
        {uniqueQuirk && (
          <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
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
