"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ExpandableText from "@/components/ui/ExpandableText";
import AdoptableToYouCount from "@/components/location/AdoptableToYouCount";
import type { BreedData } from "@/types/breeds";
import type { FilterCount } from "@/schemas/common";

interface BreedStatisticsProps {
  breedData: BreedData | null;
  className?: string;
}

function formatAge(months: number): string {
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} yr${years === 1 ? "" : "s"}`;
  return `${years}.${Math.floor((remainingMonths / 12) * 10)} yrs`;
}

/** How many are listed and their average age; an unknown age is left out. */
export default function BreedStatistics({ breedData, className = "" }: BreedStatisticsProps) {
  if (!breedData) return null;

  return (
    <div className={`breed-statistics ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-ink">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold text-ink">{breedData.count || 0}</span>
          <span className="text-sm text-subtle">available</span>
        </div>

        {breedData.average_age_months ? (
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-ink">{formatAge(breedData.average_age_months)}</span>
            <span className="text-sm text-subtle">avg age</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface BreedInfoProps {
  breedData: BreedData;
  /** The breed's per-country counts, for "adoptable to you" */
  adoptableOptions?: FilterCount[];
  onShowAdoptable?: (countryValue: string) => void;
  lastUpdated?: string;
  className?: string;
}

export function BreedInfo({ breedData, adoptableOptions, onShowAdoptable, lastUpdated, className = "" }: BreedInfoProps) {
  const handleScrollToDogs = (): void => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById("dogs-grid")
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div className={`breed-info flex flex-col gap-6 ${className}`}>
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {breedData.primary_breed}
        </h1>

        <div className="flex flex-wrap gap-2">
          {breedData.breed_group && breedData.breed_group !== "Unknown" && (
            <Badge variant="secondary" className="text-sm">
              {breedData.breed_group} Group
            </Badge>
          )}
          {breedData.count >= 50 && (
            <Badge variant="default" className="bg-green-600 text-sm">
              Popular Breed
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start gap-3">
        <BreedStatistics breedData={breedData} />
        <AdoptableToYouCount options={adoptableOptions} onShow={onShowAdoptable} />
      </div>

      {breedData.description && (
        <ExpandableText
          text={breedData.description}
          lines={4}
          className="text-base text-gray-600 dark:text-gray-300 leading-relaxed"
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button
          size="lg"
          className="bg-orange-600 hover:bg-orange-700 text-white"
          onClick={handleScrollToDogs}
        >
          View All {breedData.count} {breedData.primary_breed}s
        </Button>
        {lastUpdated && !isNaN(new Date(lastUpdated).getTime()) && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Updated{" "}
            <time dateTime={lastUpdated}>
              {new Date(lastUpdated).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          </p>
        )}
      </div>
    </div>
  );
}
