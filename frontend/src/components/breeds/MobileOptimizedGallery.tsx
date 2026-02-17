"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { TouchEvent } from "react";
import LazyImage from "@/components/ui/LazyImage";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryImage } from "@/types/breeds";

interface MobileOptimizedGalleryProps {
  images?: GalleryImage[];
  title?: string;
}

export default function MobileOptimizedGallery({
  images = [],
  title = "Photo Gallery",
}: MobileOptimizedGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent<HTMLDivElement>): void => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>): void =>
    setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = (): void => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const scrollToIndex = useCallback(
    (index: number) => {
      if (scrollRef.current) {
        const scrollWidth = scrollRef.current.scrollWidth;
        const scrollPosition = (scrollWidth / images.length) * index;
        scrollRef.current.scrollTo({ left: scrollPosition, behavior: "smooth" });
      }
    },
    [images.length],
  );

  useEffect(() => {
    scrollToIndex(currentIndex);
  }, [currentIndex, scrollToIndex]);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      {/* Mobile Horizontal Scroll Gallery */}
      <div className="lg:hidden">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-4"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className="flex-none w-[85%] sm:w-[45%] snap-center"
            >
              <div className="aspect-[4/3] relative rounded-lg overflow-hidden">
                <LazyImage
                  src={image.url}
                  alt={image.alt || `Gallery image ${index + 1}`}
                  sizes="(max-width: 640px) 85vw, 45vw"
                  className="object-cover w-full h-full absolute inset-0"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Pagination Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`min-h-[44px] min-w-[44px] p-3 flex items-center justify-center ${
                index === currentIndex ? "opacity-100" : "opacity-50"
              }`}
              aria-label={`Go to image ${index + 1}`}
            >
              <span
                className={`block w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? "bg-primary w-6" : "bg-gray-400"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Grid Gallery */}
      <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="aspect-[4/3] relative rounded-lg overflow-hidden group cursor-pointer"
          >
            <LazyImage
              src={image.url}
              alt={image.alt || `Gallery image ${index + 1}`}
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
              className="object-cover transition-transform group-hover:scale-105 w-full h-full absolute inset-0"
            />
          </div>
        ))}
      </div>

      {/* Desktop Navigation Arrows */}
      {images.length > 4 && (
        <div className="hidden lg:flex justify-between mt-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg disabled:opacity-50 min-h-[44px] min-w-[44px]"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() =>
              setCurrentIndex(Math.min(images.length - 1, currentIndex + 1))
            }
            disabled={currentIndex === images.length - 1}
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg disabled:opacity-50 min-h-[44px] min-w-[44px]"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
