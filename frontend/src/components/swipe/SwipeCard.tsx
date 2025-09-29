import React, { useState, useCallback } from "react";
import Image from "next/image";
import { Heart, X, MapPin, Calendar, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFavorites } from "../../hooks/useFavorites";
import { cn } from "@/lib/utils";
import { safeStorage } from "../../utils/safeStorage";
import { type Dog } from "../../types/dog";
import { FallbackImage } from "../ui/FallbackImage";
import { getPersonalityTraitColor } from "../../utils/personalityColors";
import ShareButton from "../ui/ShareButton";
import { getAgeCategory } from "../../utils/dogHelpers";
import { IMAGE_SIZES } from "../../constants/imageSizes";
import * as Sentry from "@sentry/nextjs";

interface SwipeCardProps {
  dog: Dog;
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

      await addFavorite(Number(dog.id), dog.name);

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

  // Access enriched LLM data
  const profileData = dog.dogProfilerData || {};
  const tagline = profileData.tagline || "";
  const uniqueQuirk = profileData.uniqueQuirk || "";
  const personalityTraits = profileData.personalityTraits || [];
  const favoriteActivities = profileData.favoriteActivities || [];

  // Get age category
  const ageCategory = getAgeCategory({
    age_min_months: dog.age_min_months,
    age_max_months: dog.age_max_months,
    age_text: dog.age,
  });

  // Get breed, preferring primary_breed
  const breed = dog.primary_breed || dog.breed;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/50 overflow-hidden relative group transition-colors flex flex-col"
      style={{ borderRadius: "12px" }}
    >
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
        <div onClick={(e) => e.stopPropagation()}>
          <ShareButton
            url={`${typeof window !== "undefined" ? window.location.origin : "https://www.rescuedogs.me"}/dog/${dog.id}`}
            title={`Check out ${dog.name} for adoption!`}
            text={
              dog.description ||
              `${dog.name} is a ${ageCategory || ""} ${breed || ""} looking for a forever home!`
            }
            compact={true}
            variant="ghost"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-lg hover:scale-110 transition-all text-gray-700 dark:text-gray-200"
          />
        </div>
        <button
          onClick={handleFavorite}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-all ${isLiked ? "scale-125" : ""}`}
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
        className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden rounded-t-xl flex-shrink-0"
        data-testid="image-container"
      >
        <FallbackImage
          src={dog.image || "/placeholder_dog.svg"}
          alt={`${dog.name} - Available for adoption`}
          fill
          className="object-cover md:object-contain"
          sizes={IMAGE_SIZES.SWIPE_CARD}
          priority={!isStacked}
          fallbackSrc="/placeholder_dog.svg"
        />
      </div>

      {/* Essential Info with Enriched Data */}
      <div className="p-6 flex flex-col space-y-4 dark:bg-gray-800 overflow-y-auto flex-1">
        {/* Primary info: Name, Age, Breed */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {dog.name}
          </h3>
          {(ageCategory || breed) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {[ageCategory, breed].filter(Boolean).join(" • ")}
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
            {personalityTraits.slice(0, 3).map((trait: string, idx: number) => (
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