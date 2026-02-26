"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ExpandableText from "@/components/ui/ExpandableText";
import type { BreedData } from "@/types/breeds";

interface BreedStatisticsProps {
  breedData: BreedData | null;
  className?: string;
}

export default function BreedStatistics({ breedData, className = "" }: BreedStatisticsProps) {
  if (!breedData) return null;

  const getAgeDisplay = (): string => {
    if (!breedData.average_age_months) {
      return "N/A";
    }

    const months = breedData.average_age_months;

    if (months < 12) {
      return `${months} mo`;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
      return `${years} yr${years === 1 ? "" : "s"}`;
    }
    return `${years}.${Math.floor((remainingMonths / 12) * 10)} yrs`;
  };

  const getSexDistributionDisplay = (): { male: number; female: number; malePercentage: number; femalePercentage: number; total: number } | null => {
    if (!breedData.sex_distribution) return null;

    const { male = 0, female = 0 } = breedData.sex_distribution;
    const total = male + female;

    if (total === 0) return null;

    const malePercentage = Math.round((male / total) * 100);
    const femalePercentage = Math.round((female / total) * 100);

    return {
      male,
      female,
      malePercentage,
      femalePercentage,
      total,
    };
  };

  const sexData = getSexDistributionDisplay();

  return (
    <div className={`breed-statistics ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-gray-700 dark:text-gray-300">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {breedData.count || 0}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">available</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getAgeDisplay()}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">avg age</span>
        </div>
      </div>

      {sexData && (
        <div className="mt-4">
          <div className="flex items-center gap-3 text-sm mb-2">
            <div className="flex items-center gap-1">
              <span className="text-teal-600 dark:text-teal-400">♂</span>
              <span className="font-medium">{sexData.male}</span>
              <span className="text-gray-500 dark:text-gray-400">
                ({sexData.malePercentage}%)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-pink-500 dark:text-pink-400">♀</span>
              <span className="font-medium">{sexData.female}</span>
              <span className="text-gray-500 dark:text-gray-400">
                ({sexData.femalePercentage}%)
              </span>
            </div>
          </div>
          <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              data-testid="male-bar"
              className="absolute left-0 top-0 h-full bg-teal-500 dark:bg-teal-400 rounded-full transition-all duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${sexData.malePercentage}%` }}
              aria-label={`${sexData.male} males out of ${sexData.total} dogs`}
            />
            <div
              data-testid="female-bar"
              className="absolute right-0 top-0 h-full bg-pink-400 dark:bg-pink-300 rounded-full transition-all duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${sexData.femalePercentage}%` }}
              aria-label={`${sexData.female} females out of ${sexData.total} dogs`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface BreedInfoProps {
  breedData: BreedData;
  lastUpdated?: string;
  className?: string;
}

export function BreedInfo({ breedData, lastUpdated, className = "" }: BreedInfoProps) {
  const handleScrollToDogs = (): void => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById("dogs-grid")
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div className={`breed-info flex flex-col gap-5 ${className}`}>
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

      <BreedStatistics breedData={breedData} />

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
