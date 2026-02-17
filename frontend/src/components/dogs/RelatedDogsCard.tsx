"use client";
import React, { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import NextImage from "../ui/NextImage";
import { getThumbnailImage } from "../../utils/imageUtils";
import type { Dog } from "@/types/dog";
import type { RelatedDogsCardProps } from "@/types/dogComponents";

const RelatedDogsCard = memo(function RelatedDogsCard({
  dog,
}: RelatedDogsCardProps): React.ReactElement {
  const router = useRouter();

  const handleCardClick = useCallback(() => {
    const slug = dog.slug || `unknown-dog-${dog.id}`;
    router.push(`/dogs/${slug}`);
  }, [router, dog.id, dog.slug]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick],
  );

  const formatAge = (dog: Dog): string => {
    if (dog.age_min_months) {
      if (dog.age_min_months < 12) {
        return `${dog.age_min_months} month${dog.age_min_months === 1 ? "" : "s"}`;
      } else {
        const years = Math.floor(dog.age_min_months / 12);
        const months = dog.age_min_months % 12;
        if (months === 0) {
          return `${years} year${years === 1 ? "" : "s"}`;
        } else {
          return `${years} year${years === 1 ? "" : "s"}, ${months} month${months === 1 ? "" : "s"}`;
        }
      }
    }
    return dog.age_text || "Age unknown";
  };

  const formatBreed = (dog: Dog): string => {
    return dog.standardized_breed || dog.breed || "Mixed breed";
  };

  return (
    <div
      data-testid="related-dog-card"
      className="bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:transform hover:-translate-y-1 cursor-pointer group will-change-transform focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${dog.name}`}
    >
      {/* Image Container with 4:3 Aspect Ratio */}
      <div
        data-testid="related-dog-image-container"
        className="aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-gray-200"
      >
        {dog.primary_image_url ? (
          <NextImage
            src={getThumbnailImage(dog.primary_image_url)}
            alt={`${dog.name} - ${formatBreed(dog)} available for adoption`}
            className="group-hover:scale-105 transition-transform duration-200"
            sizes="related-dog"
            aspectRatio="4/3"
            layout="fill"
            objectFit="cover"
            objectPosition="center 30%"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-gray-400 text-4xl">{"\uD83D\uDC15"}</div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Dog Name */}
        <h3
          data-testid="related-dog-name"
          className="text-card-title text-gray-900 dark:text-gray-100 hover:text-orange-600 transition-colors duration-300 mb-1"
        >
          {dog.name}
        </h3>

        {/* Breed */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {formatBreed(dog)}
        </p>

        {/* Age */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatAge(dog)}
        </p>
      </div>
    </div>
  );
});

export default RelatedDogsCard;
