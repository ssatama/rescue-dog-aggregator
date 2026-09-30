"use client";

import React, { useState, useRef, useCallback } from "react";
import { FallbackImage } from "../ui/FallbackImage";
import Link from "next/link";

interface CarouselDog {
  id: number | string;
  name: string;
  slug: string;
  primary_image_url: string;
}

interface BreedMobileCarouselProps {
  dogs: CarouselDog[];
  breedName: string;
}

function getSlideWidth(container: HTMLDivElement): number {
  const firstSlide = container.querySelector<HTMLElement>("[data-slide]");
  return firstSlide?.offsetWidth ?? container.offsetWidth * 0.7;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function BreedMobileCarousel({
  dogs,
  breedName,
}: BreedMobileCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const displayedDogs = dogs?.slice(0, 6) || [];
  const lastIndex = displayedDogs.length - 1;

  const scrollToSlide = useCallback((index: number): void => {
    if (!carouselRef.current) return;

    const clamped = Math.max(0, Math.min(index, lastIndex));
    const slideWidth = getSlideWidth(carouselRef.current);
    const gap = 12;
    carouselRef.current.scrollTo({
      left: clamped * (slideWidth + gap),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    setCurrentSlide(clamped);
  }, [lastIndex]);

  const handleScroll = (): void => {
    if (!carouselRef.current) return;

    const slideWidth = getSlideWidth(carouselRef.current);
    const gap = 12;
    const raw = Math.round(carouselRef.current.scrollLeft / (slideWidth + gap));
    const clamped = Math.max(0, Math.min(raw, lastIndex));
    if (clamped !== currentSlide) {
      setCurrentSlide(clamped);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;

    e.preventDefault();
    const next =
      e.key === "Home" ? 0 :
      e.key === "End" ? lastIndex :
      e.key === "ArrowLeft" ? currentSlide - 1 :
      currentSlide + 1;

    scrollToSlide(next);
  };

  return (
    <div className="w-full">
      <div
        ref={carouselRef}
        tabIndex={0}
        role="region"
        aria-label={`${breedName} photo carousel`}
        aria-roledescription="carousel"
        className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-hide focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-xl"
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {displayedDogs.map((dog, index) => (
          <Link
            key={dog.id}
            data-slide
            href={`/dogs/${dog.slug}`}
            className="flex-shrink-0 w-[70vw] max-w-[280px] aspect-[4/5] relative overflow-hidden rounded-xl cursor-pointer group block snap-start"
          >
            <FallbackImage
              src={dog.primary_image_url}
              alt={`${dog.name} - ${breedName} rescue dog`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none"
              priority={index < 3}
              sizes="(max-width: 640px) 70vw, 280px"
              fallbackSrc="/images/dog-placeholder.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="text-white text-sm font-medium">
                {dog.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex justify-center mt-3 gap-1.5">
        {displayedDogs.map((_, index) => {
          const isActive = currentSlide === index;
          return (
            <button
              key={index}
              className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                isActive
                  ? "w-6 bg-orange-600"
                  : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
              }`}
              onClick={() => scrollToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}

interface BreedPhotoGalleryProps {
  dogs: CarouselDog[];
  breedName: string;
  className?: string;
}

export default function BreedPhotoGallery({ dogs, breedName, className = "" }: BreedPhotoGalleryProps) {
  // Every breed page has dogs, so no photos only means a fetch failed: leave
  // the gallery out rather than apologise for it (#660)
  if (!dogs || dogs.length === 0) {
    return null;
  }

  return (
    <div className={`breed-photo-gallery ${className}`}>
      {/* Desktop: Clean Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-3 gap-2">
          {dogs.slice(0, 6).map((dog, index) => (
            <Link
              key={dog.id}
              href={`/dogs/${dog.slug}`}
              className="relative overflow-hidden rounded-xl cursor-pointer group block aspect-[4/5]"
            >
              <FallbackImage
                src={dog.primary_image_url}
                alt={`${dog.name} - ${breedName} rescue dog`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={index < 3}
                fallbackSrc="/images/dog-placeholder.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none" />
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none">
                <span className="text-white text-sm font-medium">
                  {dog.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile: Swipeable Carousel */}
      <div className="md:hidden">
        <BreedMobileCarousel
          dogs={dogs}
          breedName={breedName}
        />
      </div>
    </div>
  );
}
