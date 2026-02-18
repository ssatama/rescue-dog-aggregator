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

      await addFavorite(dog.id, dog.name);

      Sentry.addBreadcrumb({
        message: "swipe.card.favorited_via_button",
        category: "swipe",
        level: "info",
        data: {
          dogId: dog.id,
          dogName: dog.name,
        },
      });

      setTimeout(() => setShowHeartAnimation(false), 1000);
    },
    [dog.id, dog.name, addFavorite],
  );

  // Access enriched LLM data
  const profileData = dog.dog_profiler_data || {};
  const tagline = profileData.tagline || "";
  const uniqueQuirk = profileData.unique_quirk || "";
  const personalityTraits = profileData.personality_traits || [];
  const favoriteActivities = profileData.favorite_activities || [];

  // Get age category
  const ageCategory = getAgeCategory({
    age_min_months: dog.age_min_months,
    age_max_months: dog.age_max_months,
    age_text: dog.age,
  });

  // Get breed, preferring primary_breed
  const breed = dog.primary_breed || dog.breed;

  const subtitle = [ageCategory !== "Unknown" ? ageCategory : null, breed]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[var(--shadow-orange-lg)] dark:shadow-gray-900/50 overflow-hidden relative group transition-colors flex flex-col border border-orange-100/60 dark:border-gray-700">
      {/* Image Section — Hero */}
      <div
        className="relative aspect-[3/4] min-h-[280px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden flex-shrink-0"
        data-testid="image-container"
      >
        <FallbackImage
          src={dog.primary_image_url || "/placeholder_dog.svg"}
          alt={`${dog.name} - Available for adoption`}
          fill
          className="object-cover"
          sizes={IMAGE_SIZES.SWIPE_CARD}
          priority={!isStacked}
          fallbackSrc="/placeholder_dog.svg"
        />

        {/* Gradient overlay for name */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

        {/* Name and breed overlaid on image */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-[5]">
          <h3 className="text-2xl font-bold text-white drop-shadow-md line-clamp-1">
            {dog.name}
          </h3>
          {subtitle ? (
            <p className="text-sm text-white/80 mt-0.5 line-clamp-1 drop-shadow-sm">
              {subtitle}
            </p>
          ) : null}
        </div>

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
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-lg hover:scale-110 transition-transform text-gray-700 dark:text-gray-200"
            />
          </div>
          <button
            onClick={handleFavorite}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${isLiked ? "scale-125" : ""}`}
            aria-label="Add to favorites"
          >
            <span
              className={`text-lg sm:text-xl ${showHeartAnimation ? "animate-ping" : ""}`}
            >
              {isLiked ? "❤️" : "🤍"}
            </span>
          </button>
        </div>
      </div>

      {/* Content Section — Compact */}
      <div className="p-4 flex flex-col gap-3 dark:bg-gray-800 overflow-y-auto flex-1">
        {/* Tagline in Caveat handwritten font */}
        {tagline ? (
          <p className="font-[family-name:var(--font-caveat)] text-lg text-gray-700 dark:text-gray-300 line-clamp-2 leading-snug">
            {tagline}
          </p>
        ) : null}

        {/* Top 3 Personality Traits */}
        {personalityTraits.length > 0 ? (
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
        ) : null}

        {/* What Makes Me Special */}
        {uniqueQuirk ? (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2">
              <span className="text-base flex-shrink-0">✨</span>
              <span className="line-clamp-2">{uniqueQuirk}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const SwipeCard = React.memo(SwipeCardComponent);
