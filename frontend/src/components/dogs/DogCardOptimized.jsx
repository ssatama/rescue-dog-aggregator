import React, { useMemo, useCallback } from "react";
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
import NextImage from "../ui/NextImage";
import { FavoriteButton } from "../favorites/FavoriteButton";
import ShareButton from "../ui/ShareButton";
import { sanitizeText } from "../../utils/security";
import { formatShipsToList } from "../../utils/countries";
import {
  formatAge,
  getAgeCategory,
  formatBreed,
  formatGender,
  isRecentDog,
  getOrganizationName,
  getShipsToCountries,
  formatExperienceLevel,
  formatCompatibility,
  getPersonalityTraits,
} from "../../utils/dogHelpers";
import { trackDogCardClick } from "@/lib/monitoring/breadcrumbs";

const DogCardOptimized = React.memo(
  function DogCardOptimized({
    dog,
    priority = false,
    animationDelay = 0,
    compact = false,
    embedded = false,
    isVirtualized = false,
    position = 0,
    listContext = "home",
  }) {
  // Enhanced data processing using helper functions
  const name = dog?.name || "Unknown Dog";
  const breed = formatBreed(dog);
  const breedGroup = sanitizeText(dog?.breed_group);

  const id = dog?.id || "0";
  const slug = dog?.slug || `unknown-dog-${id}`;
  const status = sanitizeText(dog?.status || "unknown");

  // Enhanced data using helper functions
  const formattedAge = formatAge(dog);
  const ageCategory = getAgeCategory(dog);
  const genderData = formatGender(dog);
  const organizationName = getOrganizationName(dog);
  const shipsToCountries = getShipsToCountries(dog);
  const showNewBadge = isRecentDog(dog);

  // New uncertainty indicators and enhanced data
  const experienceLevel = formatExperienceLevel(dog);
  const compatibility = formatCompatibility(dog);
  const personalityTraits = getPersonalityTraits(dog);

  // Helper function to get standardized size for data attribute
  const getStandardizedSize = (dog) => {
    const size = dog?.standardized_size || dog?.size || "";
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

  // Memoize share data to prevent string recreation on every render
  const shareData = useMemo(
    () => ({
      url: `${typeof window !== "undefined" ? window.location.origin : ""}/dogs/${slug}`,
      title: `Meet ${name}`,
      text: `Check out ${name} from ${organizationName} - Looking for a loving home!`,
    }),
    [slug, name, organizationName]
  );

  // Memoize click handler to prevent recreation
  const handleCardClick = useCallback(() => {
    if (id && id !== "0" && name && name !== "Unknown Dog") {
      try {
        trackDogCardClick(id.toString(), name, position, listContext);
      } catch (error) {
        console.error("Failed to track dog card click:", error);
      }
    }
  }, [id, name, position, listContext]);

  // Calculate animation delay class (only for non-virtualized items)
  const animationClass = !isVirtualized
    ? `animate-fadeInUp animate-delay-${Math.min(animationDelay * 100, 400)}`
    : "";

  // Ultra-compact embedded mode for guide pages
  if (embedded) {
    return (
      <Card
        data-testid={dog?.id ? `dog-card-${dog.id}` : "dog-card"}
        data-embedded="true"
        className={`dog-card content-fade-in group transition-[transform,box-shadow] duration-300 hover:shadow-xl overflow-hidden rounded-xl h-full min-w-0 ${animationClass}`}
        style={{ borderRadius: "12px" }}
      >
        <Link
          href={`/dogs/${slug}`}
          className="block h-full"
          prefetch={priority ? true : false}
          onClick={handleCardClick}
        >
          {/* Compact 16:9 image */}
          <div
            className="aspect-[16/9] relative overflow-hidden bg-muted dark:bg-muted/50"
            data-testid="image-container"
          >
            <NextImage
              src={dog.primary_image_url}
              alt={`${name} - ${breed || "Dog"} available for adoption`}
              className="dog-card-image transition-transform duration-300 ease-out group-hover:scale-105"
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              aspectRatio="16/9"
              layout="fill"
              objectFit="cover"
              objectPosition="center 30%"
              blurDataURL={dog.blur_data_url}
            />
          </div>

          {/* Minimal info */}
          <div className="p-4 space-y-2">
            <CardTitle className="text-lg hover:underline truncate">
              {name}
            </CardTitle>

            <div className="space-y-1 text-sm text-muted-foreground">
              {breed && <p className="truncate">{breed}</p>}
              <p className="flex items-center gap-2">
                {formattedAge && ageCategory !== "Unknown" && (
                  <span>🎂 {ageCategory}</span>
                )}
                <span>
                  {genderData.icon} {genderData.text}
                </span>
              </p>
              {organizationName && (
                <p className="truncate">{organizationName}</p>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <span className="inline-flex items-center justify-center">
                Meet {name} →
              </span>
            </Button>
          </div>
        </Link>
      </Card>
    );
  }

  // Compact mobile list view for better space utilization
  if (compact) {
    return (
      <Card
        data-testid={dog?.id ? `dog-card-${dog.id}` : "dog-card"}
        className={`dog-card content-fade-in group transition-[transform,box-shadow] duration-300 hover:shadow-xl overflow-hidden flex flex-row md:flex-col h-auto md:h-full rounded-xl ${animationClass}`}
        style={{ borderRadius: "12px" }}
      >
        {/* Compact mobile image */}
        <Link
          href={`/dogs/${slug}`}
          className="block w-32 md:w-full flex-shrink-0"
          prefetch={priority ? true : false}
          onClick={handleCardClick}
        >
          <div
            className="aspect-[4/3] relative overflow-hidden bg-muted dark:bg-muted/50"
            data-testid="image-container"
          >
            <NextImage
              src={dog.primary_image_url}
              alt={`${name} - ${breed || "Dog"} available for adoption`}
              className="dog-card-image transition-transform duration-300 ease-out group-hover:scale-105"
              priority={priority}
              sizes="128px"
              aspectRatio="4/3"
              layout="fill"
              objectFit="cover"
              objectPosition="center 30%"
              blurDataURL={dog.blur_data_url}
            />
          </div>
        </Link>

        {/* Compact content */}
        <div className="flex-1 p-3 md:p-4">
          <div className="flex items-start justify-between mb-2">
            <Link
              href={`/dogs/${slug}`}
              prefetch={priority ? true : undefined}
              onClick={handleCardClick}
            >
              <CardTitle className="text-base md:text-lg hover:underline">
                {name}
              </CardTitle>
            </Link>
            <div className="flex items-center gap-1">
              <ShareButton
                url={shareData.url}
                title={shareData.title}
                text={shareData.text}
                variant="ghost"
                compact
              />
              <FavoriteButton
                dogId={dog.id}
                dogName={dog.name}
                orgSlug={dog.organization?.slug}
                compact
              />
            </div>
          </div>

          {/* Mobile-optimized info */}
          <div className="space-y-1 text-sm text-muted-foreground">
            {formattedAge && ageCategory !== "Unknown" && (
              <p className="flex items-center gap-1">
                <span>🎂</span>
                <span>{ageCategory}</span>
              </p>
            )}
            <p className="flex items-center gap-1">
              <span>{genderData.icon}</span>
              <span>{genderData.text}</span>
            </p>
            {breed && <p className="truncate">{breed}</p>}

            {/* Experience level for mobile */}
            {experienceLevel && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                👥 {experienceLevel}
              </p>
            )}

            {/* Quick compatibility indicators for mobile */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`${compatibility.withDogs.color}`}>
                🐕 {compatibility.withDogs.text}
              </span>
              <span className={`${compatibility.withCats.color}`}>
                🐱 {compatibility.withCats.text}
              </span>
            </div>
          </div>

          {/* Organization - hidden on mobile */}
          <p className="hidden md:block text-sm text-muted-foreground mt-2">
            {organizationName}
          </p>

          {/* CTA Button */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full mt-3 md:hidden animate-button-hover"
          >
            <Link
              href={`/dogs/${slug}`}
              prefetch={priority ? true : undefined}
              onClick={handleCardClick}
            >
              Meet {name} →
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  // Standard desktop card view
  return (
    <Card
      data-testid={dog?.id ? `dog-card-${dog.id}` : "dog-card"}
      data-size={standardizedSize.toLowerCase().replace(" ", "-")}
      data-age={ageCategory?.toLowerCase() || "unknown"}
      data-sex={genderData.text.toLowerCase()}
      data-status={status}
      data-priority={priority ? "true" : "false"}
      className={`rounded-xl bg-card text-card-foreground shadow-sm dark:shadow-lg dark:shadow-purple-500/5 will-change-transform dog-card content-fade-in group transition-[transform,box-shadow] duration-300 hover:shadow-xl overflow-hidden flex flex-col h-full ${animationClass}`}
      style={{ borderRadius: "12px" }}
    >
      {/* Image container */}
      <Link
        href={`/dogs/${slug}`}
        className="block"
        prefetch={priority ? true : undefined}
        onClick={handleCardClick}
      >
        <div
          className="aspect-[4/3] relative overflow-hidden bg-muted dark:bg-muted/50"
          data-testid="image-container"
        >
          {showNewBadge && (
            <Badge
              className="absolute top-2 left-2 z-10 bg-green-500 text-white"
              data-testid="new-badge"
              aria-label="Recently added dog"
            >
              NEW
            </Badge>
          )}

          {/* Status badge for accessibility - positioned to avoid overlap with NEW badge */}
          {status && status !== "available" && (
            <Badge
              className={`absolute top-2 z-10 ${showNewBadge ? "right-2" : "left-2"}`}
              variant={status === "adopted" ? "secondary" : "outline"}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          )}
          <NextImage
            src={dog.primary_image_url}
            alt={`${name} - ${breed || "Dog"} available for adoption`}
            className="dog-card-image transition-transform duration-300 ease-out group-hover:scale-105"
            priority={priority}
            sizes="dog-card"
            aspectRatio="4/3"
            layout="fill"
            objectFit="cover"
            objectPosition="center 30%"
            blurDataURL={dog.blur_data_url}
          />
        </div>
      </Link>

      {/* Card content */}
      <CardHeader className="pb-3 min-h-[64px]">
        <div className="flex items-start justify-between">
          <Link
            href={`/dogs/${slug}`}
            prefetch={priority ? true : undefined}
            onClick={handleCardClick}
          >
            <h3
              className="text-card-title hover:underline truncate"
              data-testid="dog-name"
            >
              {name}
            </h3>
          </Link>
          <div className="flex items-center gap-1">
            <ShareButton
              url={shareData.url}
              title={shareData.title}
              text={shareData.text}
              variant="ghost"
              compact
            />
            <FavoriteButton
              dogId={dog.id}
              dogName={dog.name}
              orgSlug={dog.organization?.slug}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3 min-h-[200px]" data-testid="card-content">
        {/* Age and Gender */}
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground min-h-[20px]"
          data-testid="age-gender-row"
        >
          {formattedAge && ageCategory !== "Unknown" && (
            <>
              <span data-testid="age-category">🎂 {ageCategory}</span>
            </>
          )}
          <span data-testid="gender-display">
            {genderData.icon} {genderData.text}
          </span>
        </div>

        {/* Breed */}
        <div className="min-h-[24px]">
          {breed && breed !== "Unknown" && breed !== "Unknown Breed" ? (
            <div className="space-y-1">
              <p className="text-sm font-medium truncate" data-testid="dog-breed">
                {breed}
              </p>
            </div>
          ) : null}
        </div>

        {/* Organization */}
        <p
          className="text-sm text-muted-foreground min-h-[20px] line-clamp-1"
          data-testid="location-display"
        >
          {organizationName}
        </p>

        {/* Experience Level */}
        <div className="pt-1 min-h-[24px]" data-testid="experience-display">
          {experienceLevel ? (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              👥 {experienceLevel}
            </p>
          ) : null}
        </div>

        {/* Compatibility indicators */}
        <div className="pt-1 space-y-1 min-h-[28px]" data-testid="compatibility-display">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>🐕</span>
              <span className={compatibility.withDogs.color}>
                {compatibility.withDogs.text}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>🐱</span>
              <span className={compatibility.withCats.color}>
                {compatibility.withCats.text}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>👶</span>
              <span className={compatibility.withChildren.color}>
                {compatibility.withChildren.text}
              </span>
            </div>
          </div>
        </div>

        {/* Special traits with hover */}
        <div className="pt-1 min-h-[32px]" data-testid="traits-display">
          {personalityTraits.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {personalityTraits.map((trait, index) => (
                <span
                  key={index}
                  title={trait}
                  className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full truncate max-w-20"
                >
                  {trait}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Ships to countries */}
        <div className="pt-2 min-h-[40px]" data-testid="ships-to-display">
          {shipsToCountries && shipsToCountries.length > 0 ? (
            <>
              <div className="text-xs text-muted-foreground mb-1">
                Adoptable to:
              </div>
              <div className="text-xs">{formatShipsToList(shipsToCountries)}</div>
            </>
          ) : null}
        </div>
      </CardContent>

      {/* Call to action */}
      <CardFooter className="pt-0" data-testid="card-footer">
        <Button
          asChild
          variant="outline"
          className="w-full animate-button-hover"
        >
          <Link
            href={`/dogs/${slug}`}
            prefetch={priority ? true : undefined}
            onClick={handleCardClick}
          >
            Meet {name} →
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
  },
  (prevProps, nextProps) =>
    prevProps.dog?.id === nextProps.dog?.id &&
    prevProps.priority === nextProps.priority &&
    prevProps.compact === nextProps.compact &&
    prevProps.embedded === nextProps.embedded &&
    prevProps.isVirtualized === nextProps.isVirtualized &&
    prevProps.position === nextProps.position
);

export default DogCardOptimized;