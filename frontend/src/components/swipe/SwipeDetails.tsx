import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { useFavorites } from "@/hooks/useFavorites";
import { ImageCarousel } from "./ImageCarousel";
import { AdoptionCTA } from "./AdoptionCTA";
import { X, Share, Heart } from "lucide-react";
import { getPersonalityTraitColor } from "../../utils/personalityColors";

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

  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">(
    "idle",
  );

  const handleShare = async () => {
    const shareTitle = `Check out ${dog.name} for adoption!`;
    const shareText =
      dog.dog_profiler_data?.description ||
      `${dog.name} is a ${dog.age} ${dog.breed} looking for a forever home!`;
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
          setShareStatus("shared");
          setTimeout(() => setShareStatus("idle"), 2000);

          Sentry.captureEvent({
            message: "swipe.details.shared",
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
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);

      Sentry.captureEvent({
        message: "swipe.details.shared",
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
  };

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
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
            style={{ transform: `translateY(${dragY}px)` }}
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
              <ImageCarousel images={allImages} dogName={dog.name} />

              <div className="px-4 py-6 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2 dark:text-gray-100">
                    {dog.name}
                  </h1>

                  <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="text-orange-500">🐾</span> {dog.age}
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

                <div className="space-y-3 pt-4">
                  <AdoptionCTA
                    adoptionUrl={dog.adoption_url || ""}
                    dogId={dog.id}
                    dogName={dog.name}
                    organizationName={dog.organization_name}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleShare}
                      className={`flex-1 py-3 px-4 border rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        shareStatus === "copied"
                          ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                          : shareStatus === "shared"
                            ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Share size={20} />
                      {shareStatus === "copied"
                        ? "Link Copied!"
                        : shareStatus === "shared"
                          ? "Shared!"
                          : "Share"}
                    </button>

                    {!isAlreadyFavorite && (
                      <button
                        onClick={handleSave}
                        className="flex-1 py-3 px-4 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full font-medium hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Heart size={20} />
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
