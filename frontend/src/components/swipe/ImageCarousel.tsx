import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { IMAGE_SIZES } from "../../constants/imageSizes";

interface ImageCarouselProps {
  images: string[];
  dogName: string;
  overlayButtons?: React.ReactNode;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  dogName,
  overlayButtons,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  const allImages = images.length > 0 ? images : [];
  const showDots = allImages.length > 1;

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!showDots) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < allImages.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDots) return;

    if (e.key === "ArrowRight" && currentIndex < allImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.key === "ArrowLeft" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.focus();
    }
  }, []);

  if (allImages.length === 0) {
    return (
      <div
        data-testid="image-placeholder"
        className="w-full aspect-square bg-gray-200 rounded-t-2xl flex items-center justify-center"
      >
        <div className="text-gray-400 text-6xl">🐕</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        data-testid="carousel-container"
        className="relative w-full aspect-square overflow-hidden rounded-t-2xl bg-gray-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {allImages.map((image, index) => (
          <div
            key={index}
            className={`
              absolute inset-0 transition-opacity duration-300
              ${index === currentIndex ? "opacity-100" : "opacity-0"}
            `}
          >
            <Image
              src={image}
              alt={`${dogName} - Photo ${index + 1}`}
              fill
              className="object-cover"
              sizes={IMAGE_SIZES.CAROUSEL}
              priority={index === 0}
            />
          </div>
        ))}

        {/* Overlay buttons */}
        {overlayButtons && (
          <div className="absolute top-4 right-4 z-10">{overlayButtons}</div>
        )}
      </div>

      {showDots && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {allImages.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to image ${index + 1}`}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${index === currentIndex ? "bg-gray-800 w-4" : "bg-gray-300"}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};