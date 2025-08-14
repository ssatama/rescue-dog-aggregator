import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ResponsiveDogImage from "../ui/ResponsiveDogImage";
import { sanitizeText } from "../../utils/security";
import { useFadeInAnimation, useHoverAnimation } from "../../utils/animations";
import { formatShipsToList } from "../../utils/countries";
import {
  formatAge,
  getAgeCategory,
  formatBreed,
  formatGender,
  isRecentDog,
  getOrganizationName,
  getShipsToCountries,
} from "../../utils/dogHelpers";

const DogCard = React.memo(function DogCard({
  dog,
  priority = false,
  animationDelay = 0,
  imageProps = {},
}) {
  // Animation hooks
  const { ref: cardRef, isVisible } = useFadeInAnimation({
    delay: animationDelay,
    threshold: 0.2,
  });
  const { hoverProps } = useHoverAnimation({
    scale: 1.02,
    translateY: -4,
    duration: 300,
  });

  // Enhanced data processing using helper functions
  const name = sanitizeText(dog?.name || "Unknown Dog");
  const breed = formatBreed(dog);
  const breedGroup = sanitizeText(dog?.breed_group);

  const id = dog?.id || "0";
  const slug = dog?.slug || `unknown-dog-${id}`;
  const status = sanitizeText(dog?.status || "unknown");

  // Enhanced data using helper functions
  const formattedAge = formatAge(dog);
  const ageCategory = getAgeCategory(dog);
  const gender = formatGender(dog);
  const organizationName = getOrganizationName(dog);
  const shipsToCountries = getShipsToCountries(dog);
  const showNewBadge = isRecentDog(dog);

  // Helper function to get standardized size for data attribute
  const getStandardizedSize = (dog) => {
    const size = dog?.standardized_size || dog?.size || "";
    // Map backend standardized_size to frontend display values
    const sizeMapping = {
      Tiny: "Tiny",
      Small: "Small",
      Medium: "Medium",
      Large: "Large",
      XLarge: "Extra Large",
    };
    return sizeMapping[size] || size || "Unknown";
  };

  const standardizedSize = getStandardizedSize(dog);

  return (
    <Card
      ref={cardRef}
      data-testid="dog-card"
      data-breed={breed}
      data-size={standardizedSize}
      data-age={ageCategory}
      data-sex={gender.text}
      data-organization={organizationName}
      className={`overflow-hidden h-full flex flex-col group ${
        isVisible ? "animate-page-enter" : "opacity-0 translate-y-5"
      }`}
      {...hoverProps}
    >
      <CardHeader className="p-0">
        <Link
          href={`/dogs/${slug}`}
          className="block focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2 rounded-md"
          aria-label={`View details for ${name.replace(/&[^;]+;/g, "")}`}
        >
          {/* 4:3 aspect ratio image container */}
          <div
            data-testid="image-container"
            className="aspect-[4/3] relative overflow-hidden bg-muted dark:bg-muted/50"
          >
            <ResponsiveDogImage
              dog={dog}
              className="w-full h-full"
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              {...imageProps}
            />

            {/* NEW Badge for recent dogs */}
            {showNewBadge && (
              <Badge
                data-testid="new-badge"
                aria-label="Recently added dog"
                className="absolute top-2 left-2 z-10 bg-green-500 text-white border-0 text-xs font-bold px-2 py-1"
              >
                NEW
              </Badge>
            )}

            {/* Status Badge (optional) */}
            {status !== "available" && (
              <Badge
                variant={status === "adopted" ? "secondary" : "default"}
                className="absolute top-2 right-2 z-10"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>
        </Link>
      </CardHeader>

      <CardContent
        data-testid="card-content"
        className="p-4 sm:p-6 flex flex-col flex-grow space-y-4"
      >
        {/* Enhanced prominent name display */}
        <CardTitle className="mb-0">
          <Link
            href={`/dogs/${slug}`}
            className="hover:underline transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2 rounded"
          >
            <h3
              data-testid="dog-name"
              className="text-card-title truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 mb-2"
            >
              {name}
            </h3>
          </Link>
        </CardTitle>

        {/* Age and Gender row with icons */}
        <div
          data-testid="age-gender-row"
          className="flex items-center gap-3 text-sm text-muted-foreground"
        >
          {ageCategory !== "Unknown" && (
            <div className="flex items-center gap-1">
              <span data-testid="age-icon" className="text-lg">
                🎂
              </span>
              <span
                data-testid="age-category"
                className="font-medium text-orange-600"
              >
                {ageCategory}
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span
                data-testid="formatted-age"
                className="text-muted-foreground"
              >
                {formattedAge}
              </span>
            </div>
          )}
          {gender.text !== "Unknown" && (
            <div
              data-testid="gender-display"
              className="flex items-center gap-1"
            >
              <span data-testid="gender-icon">{gender.icon}</span>
              <span>{gender.text}</span>
            </div>
          )}
        </div>

        {/* Breed information */}
        {breed && (
          <p
            data-testid="dog-breed"
            className="text-sm text-muted-foreground truncate"
          >
            {breed}
          </p>
        )}
        {breedGroup && breedGroup !== "Unknown" && (
          <Badge variant="outline" className="text-xs mb-1 w-fit">
            {breedGroup} Group
          </Badge>
        )}

        {/* Location (Organization as proxy) with icon */}
        <div
          data-testid="location-row"
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span data-testid="location-display" className="truncate">
            {organizationName}
          </span>
        </div>

        {/* Ships to countries as flag emojis */}
        {shipsToCountries.length > 0 && (
          <div
            data-testid="ships-to-display"
            className="flex items-start gap-2 text-xs"
          >
            <span className="text-muted-foreground mt-1 whitespace-nowrap">
              Adoptable to:
            </span>
            <div data-testid="ships-to-flags" className="flex-1 min-w-0">
              {formatShipsToList(shipsToCountries, 3)}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter data-testid="card-footer" className="p-4 sm:p-6 pt-0">
        <Link href={`/dogs/${slug}`} className="w-full enhanced-focus-link">
          <Button
            type="button"
            size="sm"
            className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 dark:from-orange-500 dark:to-orange-600 dark:hover:from-orange-600 dark:hover:to-orange-700 text-white cross-browser-transition enhanced-focus-button mobile-touch-target"
          >
            Meet {name} →
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
});

export default DogCard;
