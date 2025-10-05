"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatistics } from "../../services/animalsService";
import AnimatedCounter from "../ui/AnimatedCounter";

interface StatsData {
  total_dogs: number;
  total_organizations: number;
  countries?: string[];
}

interface StatItemProps {
  value: number;
  label: string;
}

export default function StatsDisplay() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStatistics();
      setStats(data as StatsData);
    } catch (err) {
      setError("Unable to load statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div data-testid="stats-loading" className="text-center py-8">
        Loading statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline transition-colors"
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalCountries = stats.countries?.length || 0;

  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="bg-gradient-to-br from-orange-50 via-orange-100/50 to-transparent dark:from-orange-950/20 dark:via-orange-900/10 dark:to-transparent rounded-2xl p-6 sm:p-8 md:p-12 lg:p-16 border border-orange-200/50 dark:border-orange-800/30 shadow-lg">
        {/* Grid lines (subtle) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,146,60,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,146,60,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="relative flex flex-col md:flex-row justify-center items-center gap-8 sm:gap-12 md:gap-16 lg:gap-24">
          <StatItem value={stats.total_dogs} label="Dogs" />
          <StatItem value={stats.total_organizations} label="Organizations" />
          <StatItem value={totalCountries} label="Countries" />
        </div>

        {/* Updated daily badge */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Updated Daily
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="relative">
        <AnimatedCounter
          value={value}
          label={label}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold bg-gradient-to-br from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300 bg-clip-text text-transparent"
        />
        {/* Subtle glow effect */}
        <div className="absolute inset-0 blur-2xl bg-orange-400/20 dark:bg-orange-400/10 -z-10"></div>
      </div>
      <p className="mt-3 text-sm uppercase tracking-widest font-semibold text-gray-600 dark:text-gray-400 letter-spacing-wide">
        {label}
      </p>
    </div>
  );
}
