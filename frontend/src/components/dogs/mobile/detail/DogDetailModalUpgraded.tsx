"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import FocusTrap from "focus-trap-react";
import { X, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { type Dog } from "@/types/dog";
import { formatBreed } from "@/utils/dogHelpers";
import {
  PersonalityTraits,
  hasPersonalitySection,
  EnergyTrainability,
  hasEnergyTrainabilitySection,
  ActivitiesQuirks,
  hasActivitiesSection,
} from "@/components/dogs/detail";
import {
  AdoptLink,
  GoodToKnow,
  LivesWith,
  canAdopt,
  dogMeta,
} from "@/components/dogs/detail/DogFactsPanel";
import { getWhere } from "@/components/dogs/DogCard";
import ShareButton from "@/components/ui/ShareButton";
import { trackDogViewed } from "@/lib/analytics";

interface DogDetailModalUpgradedProps {
  dog: Dog | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const navButtonClass =
  "inline-flex min-h-11 items-center gap-1 rounded-xl border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Swipe's "details" sheet. Its sections and adopt button are the dog page's
 * own components, so unknown facts are left out here exactly as they are there
 * (#504).
 */
const DogDetailModalUpgraded: React.FC<DogDetailModalUpgradedProps> = ({
  dog,
  isOpen,
  onClose,
  onNavigate,
  hasNext = true,
  hasPrev = true,
}) => {
  const { isFavorited, toggleFavorite: toggleFav } = useFavorites();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset states when dog changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setIsDescriptionExpanded(false);
  }, [dog?.id]);

  // Each dog shown in the modal counts as a view, including prev/next paging.
  useEffect(() => {
    if (isOpen && dog) {
      trackDogViewed(dog, "modal");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per dog shown, not per re-render of the same dog
  }, [isOpen, dog?.id]);

  // Reset image error when photo changes
  useEffect(() => {
    setImageError(false);
  }, [currentPhotoIndex, dog]);

  // Focus management - set initial focus when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Lock body scroll
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      // Cleanup on close or unmount
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowLeft":
          if (hasPrev && onNavigate) onNavigate("prev");
          break;
        case "ArrowRight":
          if (hasNext && onNavigate) onNavigate("next");
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNavigate, hasNext, hasPrev]);

  // Photo carousel navigation
  const nextPhoto = () => {
    if (dog?.photos && dog.photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % dog.photos!.length);
    }
  };

  const prevPhoto = () => {
    if (dog?.photos && dog.photos.length > 1) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? dog.photos!.length - 1 : prev - 1,
      );
    }
  };

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.rescuedogs.me";
  const shareUrl = dog?.slug ? `${origin}/dogs/${dog.slug}` : `${origin}/dogs`;

  const toggleFavorite = async () => {
    if (!dog) return;
    const numericId = parseInt(String(dog.id), 10);
    if (!isNaN(numericId)) {
      await toggleFav(numericId, dog.name, dog);
    }
  };

  if (!dog) return null;

  // Get photo array
  const photos = dog.photos || [dog.primary_image_url].filter(Boolean);
  const currentPhoto = imageError
    ? "/placeholder_dog.svg"
    : photos[currentPhotoIndex] || "/placeholder_dog.svg";

  const meta = dogMeta(dog);
  // Some responses carry traits at the top level rather than in the profile
  const profilerData =
    dog.dog_profiler_data || dog.personality_traits?.length
      ? {
          ...dog.dog_profiler_data,
          personality_traits:
            dog.dog_profiler_data?.personality_traits ?? dog.personality_traits,
        }
      : undefined;
  const where = getWhere(dog);
  const description =
    profilerData?.description ||
    dog.llm_description ||
    dog.description ||
    dog.summary ||
    (dog.properties?.description as string | undefined) ||
    (dog.properties?.raw_description as string | undefined) ||
    "";

  // Check if favorited
  const isFav = isFavorited(parseInt(String(dog.id), 10));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <FocusTrap
            active={isOpen}
            focusTrapOptions={{
              initialFocus: () => closeButtonRef.current,
              allowOutsideClick: true,
              returnFocusOnDeactivate: true,
              escapeDeactivates: false, // We handle ESC ourselves
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            >
              <motion.div
                className="bg-white dark:bg-gray-900 rounded-2xl w-[90vw] max-w-[600px] md:max-w-[700px] lg:max-w-[800px] h-[90vh] max-h-[800px] overflow-hidden shadow-2xl border border-line"
                layoutId={`dog-card-${dog.id}`}
                onClick={(e) => e.stopPropagation()}
                ref={modalContentRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-dog-name"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-line">
                  <h1
                    id="modal-dog-name"
                    className="font-display text-xl font-bold text-ink"
                  >
                    {dog.name}
                  </h1>
                  <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="p-2 hover:bg-soft rounded-full transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4 text-subtle" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="h-[calc(100%-80px)] overflow-y-auto p-5 md:p-6 lg:p-8 space-y-6 md:space-y-8 scrollbar-hide">
                  {/* Dog Image with Actions */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-soft shadow-lg">
                    <Image
                      src={currentPhoto}
                      alt={`${dog.name}'s photo`}
                      fill
                      className="object-cover"
                      priority
                      onError={() => setImageError(true)}
                    />

                    {/* Photo navigation */}
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-md"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-5 h-5 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-md"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-5 h-5 dark:text-gray-400" />
                        </button>

                        {/* Photo indicators */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {photos.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPhotoIndex(i)}
                              aria-label={`Photo ${i + 1}`}
                              className={cn(
                                "w-2 h-2 rounded-full transition-all duration-200",
                                i === currentPhotoIndex
                                  ? "w-6 bg-white"
                                  : "bg-white/50 dark:bg-gray-600/50 hover:bg-white/70 dark:hover:bg-gray-500/70",
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <ShareButton
                        url={shareUrl}
                        title={`Meet ${dog.name}`}
                        text={`${dog.name} is a ${formatBreed(dog) || "lovely dog"} looking for a forever home.`}
                        compact
                        variant="ghost"
                        className="w-10 h-10 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      />
                      <button
                        onClick={toggleFavorite}
                        aria-label={
                          isFav ? "Remove from favorites" : "Add to favorites"
                        }
                        aria-pressed={isFav}
                        className={cn(
                          "w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95",
                          isFav
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800",
                        )}
                      >
                        <Heart
                          className={cn(
                            "w-4 h-4",
                            isFav
                              ? "fill-white text-white"
                              : "text-gray-700 dark:text-gray-300",
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {(meta.length > 0 || profilerData?.tagline || where) && (
                    <div className="grid gap-1">
                      {meta.length > 0 && (
                        <p className="text-sm text-ink" data-testid="modal-dog-meta">
                          {meta.join(" · ")}
                        </p>
                      )}
                      {profilerData?.tagline && (
                        <p className="text-subtle">{profilerData.tagline}</p>
                      )}
                      {where && <p className="text-sm text-subtle">{where}</p>}
                    </div>
                  )}

                  <LivesWith dog={dog} />
                  <GoodToKnow dog={dog} />

                  {/* About Section */}
                  {description && (
                    <div>
                      <h2 className="font-semibold mb-2 text-ink">
                        About {dog.name}
                      </h2>
                      <p
                        className={cn(
                          "text-sm text-gray-700 dark:text-gray-300 leading-relaxed",
                          !isDescriptionExpanded && "line-clamp-4",
                        )}
                      >
                        {description}
                      </p>
                      {description.length > 200 && (
                        <button
                          onClick={() =>
                            setIsDescriptionExpanded(!isDescriptionExpanded)
                          }
                          className="text-orange-700 dark:text-orange-400 text-sm mt-2 hover:underline"
                        >
                          {isDescriptionExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}

                  {hasPersonalitySection(profilerData) && (
                    <div>
                      <h2 className="font-semibold mb-3 text-ink">Personality</h2>
                      <PersonalityTraits profilerData={profilerData} />
                    </div>
                  )}

                  {hasEnergyTrainabilitySection(profilerData) && (
                    <div>
                      <h2 className="font-semibold mb-3 text-ink">Energy & Training</h2>
                      <EnergyTrainability profilerData={profilerData} />
                    </div>
                  )}

                  {hasActivitiesSection(profilerData) && (
                    <div>
                      <h2 className="font-semibold mb-3 text-ink">Activities & Quirks</h2>
                      <ActivitiesQuirks profilerData={profilerData} />
                    </div>
                  )}

                  {canAdopt(dog) && (
                    <AdoptLink dog={dog} source="modal" className="flex w-full" />
                  )}

                  {onNavigate && (
                    <div className="flex items-center justify-between border-t border-line pt-6">
                      <button
                        onClick={() => onNavigate("prev")}
                        disabled={!hasPrev}
                        className={navButtonClass}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        Previous
                      </button>
                      <button
                        onClick={() => onNavigate("next")}
                        disabled={!hasNext}
                        className={navButtonClass}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
};

export default DogDetailModalUpgraded;
