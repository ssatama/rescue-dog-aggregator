"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function BreedStatistics({ breedData, className = "" }) {
  // Calculate age display from average_age_months
  const getAgeDisplay = () => {
    if (!breedData.average_age_months) {
      return "N/A";
    }
    
    const months = breedData.average_age_months;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    } else if (remainingMonths === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    } else {
      return `${years} ${years === 1 ? 'year' : 'years'}`;  // Simplified to just years
    }
  };

  const stats = [
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

  return (
    <div className={`breed-statistics ${className}`}>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat, index }) {
  const colorClasses = {
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div
      className={`stat-card p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${
        colorClasses[stat.color] || colorClasses.orange
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl" role="img" aria-label={stat.label}>
          {stat.icon}
        </span>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {typeof stat.value === "number"
              ? stat.value.toLocaleString()
              : stat.value}
          </div>
        </div>
      </div>
      <div className="text-sm font-medium mb-1">{stat.label}</div>
      <div className="text-xs opacity-75">{stat.description}</div>
    </div>
  );
}

export function BreedInfo({ breedData, className = "" }) {
  const handleScrollToDogs = () => {
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
      </div>

      <BreedStatistics breedData={breedData} />

      <div>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          {breedData.description}
        </p>
      </div>

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