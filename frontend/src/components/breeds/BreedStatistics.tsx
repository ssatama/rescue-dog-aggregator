"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BreedData, StatItem } from "@/types/breeds";

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
      return `${months} month${months === 1 ? "" : "s"}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;

      if (remainingMonths === 0) {
        return `${years} year${years === 1 ? "" : "s"}`;
      } else {
        return `${years}.${Math.floor((remainingMonths / 12) * 10)} years`;
      }
    }
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

  const stats: StatItem[] = [
    {
      label: "Available Dogs",
      value: breedData.count || 0,
      icon: "🐕",
      color: "orange",
      description: "Currently available for adoption",
    },
    {
      label: "Avg. Age",
      value: getAgeDisplay(),
      icon: "📅",
      color: "purple",
      description: "Average age of available dogs",
    },
  ];

  // Add sex distribution if data is available
  if (sexData) {
    stats.push({
      label: "Sex Distribution",
      value: (
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <span className="text-teal-600 text-lg">♂</span>
              <span className="text-sm font-medium">{sexData.male}</span>
              <span className="text-xs text-gray-500">
                ({sexData.malePercentage}%)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-pink-500 text-lg">♀</span>
              <span className="text-sm font-medium">{sexData.female}</span>
              <span className="text-xs text-gray-500">
                ({sexData.femalePercentage}%)
              </span>
            </div>
          </div>
          <div className="relative w-full h-8 bg-gray-100 rounded-full overflow-hidden">
            <div
              data-testid="male-bar"
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700 ease-out hover:brightness-110"
              style={{ width: `${sexData.malePercentage}%` }}
              aria-label={`${sexData.male} males out of ${sexData.total} dogs`}
            >
              <div className="flex items-center justify-center h-full text-white text-xs font-bold">
                {sexData.malePercentage > 15 && `${sexData.malePercentage}%`}
              </div>
            </div>
            <div
              data-testid="female-bar"
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-pink-400 to-pink-500 transition-all duration-700 ease-out hover:brightness-110"
              style={{ width: `${sexData.femalePercentage}%` }}
              aria-label={`${sexData.female} females out of ${sexData.total} dogs`}
            >
              <div className="flex items-center justify-center h-full text-white text-xs font-bold">
                {sexData.femalePercentage > 15 &&
                  `${sexData.femalePercentage}%`}
              </div>
            </div>
          </div>
        </div>
      ),
      icon: "🐾",
      color: "blue",
      description: "Male to female ratio",
      isCustom: true, // Flag to handle custom rendering
    });
  }

  const getStatColors = (color: string): string => {
    const colors: Record<string, string> = {
      orange: "bg-orange-50 border-orange-200 text-orange-700",
      blue: "bg-blue-50 border-blue-200 text-blue-700",
      green: "bg-green-50 border-green-200 text-green-700",
      purple: "bg-purple-50 border-purple-200 text-purple-700",
    };
    return colors[color] || colors.blue;
  };

  const StatCard = ({ stat, index }: { stat: StatItem; index: number }) => (
    <div
      className={`stat-card p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${getStatColors(
        stat.color,
      )}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {stat.isCustom ? (
        // Custom rendering for sex distribution
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl" role="img" aria-label={stat.label}>
              {stat.icon}
            </span>
            <div className="text-sm font-semibold">{stat.label}</div>
          </div>
          {stat.value}
          <div className="text-xs opacity-75 mt-2">{stat.description}</div>
        </>
      ) : (
        // Default rendering for other stats
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl" role="img" aria-label={stat.label}>
              {stat.icon}
            </span>
            <div className="text-right">
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          </div>
          <div className="text-sm font-medium mb-1">{stat.label}</div>
          <div className="text-xs opacity-75">{stat.description}</div>
        </>
      )}
    </div>
  );

  return (
    <div className={`breed-statistics ${className}`}>
      <div
        className={`grid gap-4 grid-cols-1 ${stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>
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
    document
      .getElementById("dogs-grid")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={`breed-info space-y-6 ${className}`}>
      <div>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {breedData.primary_breed}
        </h1>

        <div className="flex flex-wrap gap-2 mb-4">
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
        {lastUpdated && !isNaN(new Date(lastUpdated).getTime()) && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Data updated{" "}
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

      <BreedStatistics breedData={breedData} />

      {breedData.description && (
        <div>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            {breedData.description}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={handleScrollToDogs}
        >
          View All {breedData.count} {breedData.primary_breed}s
        </Button>
      </div>
    </div>
  );
}
