import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { useFavorites } from "@/hooks/useFavorites";
import { ImageCarousel } from "./ImageCarousel";
import { AdoptionCTA } from "./AdoptionCTA";
import { X, Heart, Share2 } from "lucide-react";
import { getPersonalityTraitColor } from "../../utils/personalityColors";
import ShareButton from "../ui/ShareButton";
import { getAgeCategory } from "../../utils/dogHelpers";

interface DogProfilerData {
  description?: string;
  personality_traits?: string[];
  energy_level?: number;
  good_with_dogs?: boolean | string;
  good_with_cats?: boolean | string;
  good_with_kids?: boolean | string;
  exercise_needs?: string;
  special_needs?: string;
  unique_quirk?: string;
}

interface Dog {
  id: number;
  name: string;
  age: string;
  age_min_months?: number;
  age_max_months?: number;
  sex: string;
  size: string;
  breed: string;
  organization_name: string;
  location: string;
  adoption_url?: string;
  image_url: string;
  additional_images?: string[];
  dog_profiler_data?: DogProfilerData;
}

interface SwipeDetailsProps {
  dog: Dog;
  isOpen: boolean;
  onClose: () => void;
}

export const SwipeDetails: React.FC<SwipeDetailsProps> = ({
  dog,
  isOpen,
  onClose,
}) => {
  const { toggleFavorite, isFavorited } = useFavorites();
  const modalRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (isOpen) {
      Sentry.captureEvent({
        message: "swipe.details.opened",
        level: "info",
        extra: {
          dog_id: dog.id,
          dog_name: dog.name,
        },
      });
    }
  }, [isOpen, dog.id, dog.name]);

  const handleSave = () => {
    toggleFavorite(dog.id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 200) {
      onClose();
    }
    setDragY(0);
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const allImages = [dog.image_url, ...(dog.additional_images || [])];
  const isAlreadyFavorite = isFavorited(dog.id);
  const profilerData = dog.dog_profiler_data;

  // Get age category
  const ageCategory = getAgeCategory({
    age_min_months: dog.age_min_months,
    age_max_months: dog.age_max_months,
    age_text: dog.age,
  });

  // Create overlay buttons
  const overlayButtons = (
    <div className="flex gap-2">
      <div onClick={(e) => e.stopPropagation()}>
        <ShareButton
          url={`${typeof window !== "undefined" ? window.location.origin : "https://www.rescuedogs.me"}/dog/${dog.id}`}
          title={`Check out ${dog.name} for adoption!`}
          text={
            dog.dog_profiler_data?.description ||
            `${dog.name} is a ${dog.age} ${dog.breed} looking for a forever home!`
          }
          compact={true}
          variant="ghost"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:scale-105 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all"
        />
      </div>
      {!isAlreadyFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:scale-105 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all flex items-center justify-center"
          aria-label={
            isAlreadyFavorite ? "Remove from favorites" : "Add to favorites"
          }
        >
          <Heart
            size={20}
            className={`${
              isAlreadyFavorite
                ? "text-red-500 fill-current"
                : "text-gray-700 dark:text-gray-200"
            }`}
          />
        </button>
      )}
    </div>
  );

  const getGoodWithIcon = (value: boolean | string | undefined) => {
    if (value === true) return "✓";
    if (value === "maybe" || value === "?") return "?";
    return "✗";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
            data-testid="modal-backdrop"
          />

          <motion.div
            ref={modalRef}
            initial={{ y: "100%" }}
            animate={{ y: dragY }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto md:right-auto bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-2xl z-50 max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:max-w-2xl lg:max-w-4xl md:w-[90vw] lg:w-[80vw] md:shadow-2xl"
            style={{ 
              transform: typeof window !== 'undefined' && window.innerWidth >= 768 
                ? `translate(-50%, -50%) translateY(${dragY}px)` 
                : `translateY(${dragY}px)` 
            }}
            data-testid="modal-content"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-4 py-3 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-gray-100">
                  Dog Details
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors mr-safe min-w-[48px] min-h-[48px] flex items-center justify-center"
                  style={{ marginRight: "env(safe-area-inset-right, 0px)" }}
                >
                  <X size={24} className="dark:text-gray-300" />
                </button>
              </div>
            </div>

            <div className="pb-safe">
              <ImageCarousel
                images={allImages}
                dogName={dog.name}
                overlayButtons={overlayButtons}
              />

              <div className="px-4 py-6 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2 dark:text-gray-100">
                    {dog.name}
                  </h1>

                  <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="text-orange-500">🐾</span> {ageCategory}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>♂</span> {dog.sex}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>📏</span> {dog.size}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <p>{dog.organization_name}</p>
                    <p>{dog.location}</p>
                  </div>
                </div>

                {profilerData?.description && (
                  <div>
                    <h3 className="text-lg font-semibold dark:text-gray-100 mb-2">
                      About {dog.name}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {profilerData.description}
                    </p>
                  </div>
                )}

                {profilerData?.personality_traits &&
                  profilerData.personality_traits.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold dark:text-gray-100 mb-3">
                        Personality
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profilerData.personality_traits
                          .slice(0, 4)
                          .map((trait, index) => (
                            <span
                              key={index}
                              className={`px-4 py-2 rounded-full text-base font-medium ${getPersonalityTraitColor(trait)}`}
                            >
                              {trait.charAt(0).toUpperCase() + trait.slice(1)}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                {(profilerData?.good_with_dogs !== undefined ||
                  profilerData?.good_with_cats !== undefined ||
                  profilerData?.good_with_kids !== undefined) && (
                  <div>
                    <h3 className="text-lg font-semibold dark:text-gray-100 mb-3">
                      Good With
                    </h3>
                    <div className="flex gap-3">
                      {profilerData.good_with_dogs !== undefined && (
                        <div
                          className={`
                          px-4 py-3 rounded-xl flex flex-col items-center gap-1
                          ${
                            profilerData.good_with_dogs === true
                              ? "bg-green-100 dark:bg-green-900/30"
                              : profilerData.good_with_dogs === "maybe"
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : "bg-gray-100 dark:bg-gray-700"
                          }
                        `}
                        >
                          <span className="text-2xl">🐕</span>
                          <span className="text-sm font-medium dark:text-gray-200">
                            Dogs {getGoodWithIcon(profilerData.good_with_dogs)}
                          </span>
                        </div>
                      )}

                      {profilerData.good_with_cats !== undefined && (
                        <div
                          className={`
                          px-4 py-3 rounded-xl flex flex-col items-center gap-1
                          ${
                            profilerData.good_with_cats === true
                              ? "bg-green-100 dark:bg-green-900/30"
                              : profilerData.good_with_cats === "maybe"
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : "bg-gray-100 dark:bg-gray-700"
                          }
                        `}
                        >
                          <span className="text-2xl">🐱</span>
                          <span className="text-sm font-medium dark:text-gray-200">
                            Cats {getGoodWithIcon(profilerData.good_with_cats)}
                          </span>
                        </div>
                      )}

                      {profilerData.good_with_kids !== undefined && (
                        <div
                          className={`
                          px-4 py-3 rounded-xl flex flex-col items-center gap-1
                          ${
                            profilerData.good_with_kids === true
                              ? "bg-green-100 dark:bg-green-900/30"
                              : profilerData.good_with_kids === "maybe"
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : "bg-gray-100 dark:bg-gray-700"
                          }
                        `}
                        >
                          <span className="text-2xl">👶</span>
                          <span className="text-sm font-medium dark:text-gray-200">
                            Kids {getGoodWithIcon(profilerData.good_with_kids)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <AdoptionCTA
                    adoptionUrl={dog.adoption_url || ""}
                    dogId={dog.id}
                    dogName={dog.name}
                    organizationName={dog.organization_name}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};