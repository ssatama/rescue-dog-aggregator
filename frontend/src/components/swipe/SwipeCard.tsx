import React, { useState, useCallback } from "react";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";
import { cn } from "@/lib/utils";
import { type Dog } from "../../types/dog";
import { FallbackImage } from "../ui/FallbackImage";
import { getPersonalityTraitColor } from "../../utils/personalityColors";
import { getGallery } from "../../utils/dogImageHelpers";
import ShareButton from "../ui/ShareButton";
import AdoptableBadge from "../location/AdoptableBadge";
import { getDogSummary, getWhere } from "../dogs/DogCard";
import { IMAGE_SIZES } from "../../constants/imageSizes";
import * as Sentry from "@sentry/nextjs";

interface SwipeCardProps {
  dog: Dog;
  /** The "Tap for details" button; the rest of the card opens details too. */
  onOpenDetails?: () => void;
}

const ROUND_BUTTON =
  "grid h-11 w-11 place-items-center rounded-full bg-white text-gray-900 shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 motion-reduce:transition-none dark:bg-gray-900 dark:text-gray-50 dark:ring-white/10";

/**
 * One dog in the swipe stack (#499). The photo fills whatever height the
 * viewport leaves, so the card and its controls always fit on screen. Photos of
 * any shape are shown whole over a blurred copy of themselves.
 */
const SwipeCardComponent = ({ dog, onOpenDetails }: SwipeCardProps) => {
  const { toggleFavorite, isFavorited } = useFavorites();
  const [photoIndex, setPhotoIndex] = useState(0);
  const isFav = isFavorited(dog.id);

  const photos = getGallery(dog);
  const photo = photos[photoIndex] ?? photos[0];
  const summary = getDogSummary(dog);
  const where = getWhere(dog);
  const profile = dog.dog_profiler_data || {};
  const traits = (profile.personality_traits || []).slice(0, 3);

  const handleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const wasFavorited = isFavorited(dog.id);
      await toggleFavorite(dog.id, dog.name, dog);
      Sentry.addBreadcrumb({
        message: wasFavorited ? "swipe.card.unfavorited_via_button" : "swipe.card.favorited_via_button",
        category: "swipe",
        level: "info",
        data: { dogId: dog.id, dogName: dog.name },
      });
    },
    [dog, toggleFavorite, isFavorited],
  );

  const step = (by: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => (i + by + photos.length) % photos.length);
  };

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://www.rescuedogs.me"}/dogs/${dog.slug ?? ""}`;

  return (
    <article
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
      data-testid="swipe-card"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-soft" data-testid="image-container">
        {photo ? (
          <>
            <FallbackImage
              src={photo.url}
              alt=""
              aria-hidden="true"
              fill
              // A native image drag would swallow the swipe gesture
              draggable={false}
              sizes={IMAGE_SIZES.SWIPE_CARD}
              className="scale-110 object-cover opacity-60 blur-xl"
            />
            <FallbackImage
              key={photo.url}
              src={photo.url}
              alt={photos.length > 1 ? `${dog.name}, photo ${photoIndex + 1} of ${photos.length}` : dog.name}
              fill
              // A native image drag would swallow the swipe gesture
              draggable={false}
              sizes={IMAGE_SIZES.SWIPE_CARD}
              className="object-contain"
              priority
            />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-5xl text-subtle" aria-hidden="true">
            🐾
          </div>
        )}

        {photos.length > 1 && (
          <>
            <ol className="absolute inset-x-3 top-2 z-[3] flex gap-1" aria-hidden="true" data-testid="photo-dots">
              {photos.map((p, i) => (
                <li
                  key={p.url}
                  className={cn("h-1 flex-1 rounded-full shadow-sm", i === photoIndex ? "bg-white" : "bg-white/50")}
                />
              ))}
            </ol>
            {/* Tap the photo's edges to step through it; a swipe changes the dog */}
            <button
              type="button"
              onClick={step(-1)}
              aria-label="Previous photo"
              className="group/edge absolute inset-y-0 left-0 z-[2] flex w-1/4 items-center justify-start pl-2 focus-visible:outline-none"
            >
              <ChevronLeft
                className="h-8 w-8 rounded-full bg-black/35 p-1 text-white opacity-0 transition-opacity group-hover/edge:opacity-100 group-focus-visible/edge:opacity-100"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={step(1)}
              aria-label="Next photo"
              className="group/edge absolute inset-y-0 right-0 z-[2] flex w-1/4 items-center justify-end pr-2 focus-visible:outline-none"
            >
              <ChevronRight
                className="h-8 w-8 rounded-full bg-black/35 p-1 text-white opacity-0 transition-opacity group-hover/edge:opacity-100 group-focus-visible/edge:opacity-100"
                aria-hidden="true"
              />
            </button>
          </>
        )}

        <div className="absolute right-3 top-5 z-[4] flex gap-2" onClick={(e) => e.stopPropagation()}>
          <ShareButton
            url={shareUrl}
            title={`Meet ${dog.name}`}
            text={`${dog.name} is looking for a home.`}
            compact
            variant="ghost"
            className={ROUND_BUTTON}
          />
          <button
            type="button"
            onClick={handleFavorite}
            className={ROUND_BUTTON}
            aria-label={isFav ? `Remove ${dog.name} from favorites` : `Add ${dog.name} to favorites`}
            aria-pressed={isFav}
          >
            <Heart className={cn("h-5 w-5", isFav && "fill-red-600 text-red-600")} aria-hidden="true" />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-3 pt-12">
          <h2 className="truncate font-display text-2xl font-bold text-white">{dog.name}</h2>
          {summary && <p className="truncate text-sm text-white/90">{summary}</p>}
        </div>
      </div>

      <div className="flex flex-none flex-col gap-2 px-4 pb-3 pt-3">
        {where ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm text-subtle">{where}</p>
            <AdoptableBadge dog={dog} />
          </div>
        ) : (
          <AdoptableBadge dog={dog} className="self-start" />
        )}
        {profile.tagline && <p className="line-clamp-1 font-display text-base text-ink">{profile.tagline}</p>}
        {traits.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Personality">
            {traits.map((trait) => (
              <li key={trait} className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", getPersonalityTraitColor(trait))}>
                {trait.charAt(0).toUpperCase() + trait.slice(1)}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails?.();
          }}
          className="self-start rounded text-xs font-medium text-subtle underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tap for details
        </button>
      </div>
    </article>
  );
};

export const SwipeCard = React.memo(SwipeCardComponent);
