"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface MobileCarouselProps {
  children: React.ReactNode;
  onSlideChange?: (slideIndex: number) => void;
  testId?: string;
}

/**
 * Mobile-optimized carousel component with touch gestures and scroll indicators
 */
const MobileCarousel: React.FC<MobileCarouselProps> = ({
  children,
  onSlideChange,
  testId = "dog-carousel",
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const totalSlides = React.Children.count(children);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      setTouchStartX(e.touches[0].clientX);
    },
    [],
  );

  // Helper function to scroll to a specific slide
  const scrollToSlide = useCallback((slideIndex: number) => {
    if (carouselRef.current) {
      const slideElement = carouselRef.current.querySelector(
        ".flex-shrink-0",
      ) as HTMLElement;
      const slideWidth = slideElement?.offsetWidth || 0;
      const gap = 16; // space-x-4 = 1rem = 16px
      const scrollPosition = slideIndex * (slideWidth + gap);

      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  }, []);

  // Handle touch end and determine swipe direction
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touchEnd = e.changedTouches[0].clientX;
      setTouchEndX(touchEnd);

      const swipeDistance = touchStartX - touchEnd;
      const minSwipeDistance = 50; // Minimum 50px for swipe

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0 && currentSlide < totalSlides - 1) {
          // Swiped left - next slide
          const newSlide = currentSlide + 1;
          scrollToSlide(newSlide);
          setCurrentSlide(newSlide);
          onSlideChange?.(newSlide);
        } else if (swipeDistance < 0 && currentSlide > 0) {
          // Swiped right - previous slide
          const newSlide = currentSlide - 1;
          scrollToSlide(newSlide);
          setCurrentSlide(newSlide);
          onSlideChange?.(newSlide);
        }
      }
    },
    [touchStartX, currentSlide, totalSlides, onSlideChange, scrollToSlide],
  );

  // Add scroll event listener to sync state with manual scrolling
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const slideElement = carousel.querySelector(
        ".flex-shrink-0",
      ) as HTMLElement;
      const slideWidth = slideElement?.offsetWidth || 0;
      const gap = 16;
      const scrollLeft = carousel.scrollLeft;
      const newSlideIndex = Math.round(scrollLeft / (slideWidth + gap));

      if (
        newSlideIndex !== currentSlide &&
        newSlideIndex >= 0 &&
        newSlideIndex < totalSlides
      ) {
        setCurrentSlide(newSlideIndex);
        onSlideChange?.(newSlideIndex);
      }
    };

    carousel.addEventListener("scroll", handleScroll, { passive: true });
    return () => carousel.removeEventListener("scroll", handleScroll);
  }, [currentSlide, totalSlides, onSlideChange]);

  // Handle scroll indicator click - scroll to the specific slide
  const handleIndicatorClick = useCallback(
    (index: number) => {
      scrollToSlide(index);
      setCurrentSlide(index);
      onSlideChange?.(index);
    },
    [onSlideChange, scrollToSlide],
  );

  // Keyboard navigation support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft" && currentSlide > 0) {
        const newSlide = currentSlide - 1;
        scrollToSlide(newSlide);
        setCurrentSlide(newSlide);
        onSlideChange?.(newSlide);
      } else if (e.key === "ArrowRight" && currentSlide < totalSlides - 1) {
        const newSlide = currentSlide + 1;
        scrollToSlide(newSlide);
        setCurrentSlide(newSlide);
        onSlideChange?.(newSlide);
      }
    },
    [currentSlide, totalSlides, onSlideChange, scrollToSlide],
  );

  return (
    <div className="mobile-carousel-container">
      {/* Carousel */}
      <div
        ref={carouselRef}
        data-testid={testId}
        className="dog-carousel mobile-swipe overflow-x-auto scroll-smooth"
        style={{
          scrollSnapType: "x mandatory",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          willChange: "transform",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Dog carousel - use arrow keys or swipe to navigate"
      >
        <div className="flex space-x-4 p-1">
          {React.Children.map(children, (child, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-72 md:w-80"
              style={{ scrollSnapAlign: "start" }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicators */}
      <div
        data-testid="scroll-indicators"
        className="flex justify-center mt-4 space-x-2"
        role="tablist"
        aria-label="Carousel navigation"
      >
        {Array.from({ length: totalSlides }, (_, index) => {
          const isActive = currentSlide === index;
          return (
            <button
              key={index}
              data-testid={
                isActive ? "scroll-indicator-active" : "scroll-indicator"
              }
              data-index={index}
              className={`w-12 h-12 rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                isActive
                  ? "bg-orange-600 border-orange-600"
                  : "bg-white border-gray-300 hover:border-orange-400"
              }`}
              onClick={() => handleIndicatorClick(index)}
              aria-label={`Go to slide ${index + 1}`}
              role="tab"
              aria-selected={isActive}
              style={{
                minWidth: "48px",
                minHeight: "48px",
              }}
            >
              <span className="sr-only">Slide {index + 1}</span>
              <div
                className={`w-2 h-2 rounded-full mx-auto ${
                  isActive ? "bg-white" : "bg-gray-400"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileCarousel;
