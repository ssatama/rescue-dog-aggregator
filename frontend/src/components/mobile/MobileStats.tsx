"use client";

import React from 'react';
import AnimatedCounter from '../ui/AnimatedCounter';

interface Statistics {
  total_dogs: number;
  total_organizations: number;
  total_breeds?: number;
}

interface MobileStatsProps {
  statistics: Statistics | null;
  loading?: boolean;
}

/**
 * MobileStats - Statistics display for mobile home page
 * Features:
 * - Shows Dogs, Rescues, and Breeds counts
 * - Animated counters for visual appeal
 * - Loading skeletons while data fetches
 * - Beige background with dark mode support
 */
export default function MobileStats({ statistics, loading = false }: MobileStatsProps) {
  const isLoading = loading || !statistics;

  if (isLoading) {
    return (
      <div className="px-4 md:hidden">
        <div className="rounded-2xl bg-orange-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((index) => (
              <div key={index} className="text-center" data-testid="stat-skeleton">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:hidden">
      <div className="rounded-2xl bg-orange-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {/* Dogs Count */}
          <div className="text-center">
            <div className="text-2xl font-semibold tracking-tight text-orange-600 dark:text-orange-400">
              <AnimatedCounter value={statistics.total_dogs} label="Dogs" />
            </div>
            <div className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
              Dogs
            </div>
          </div>

          {/* Rescues Count */}
          <div className="text-center">
            <div className="text-2xl font-semibold tracking-tight text-orange-600 dark:text-orange-400">
              <AnimatedCounter value={statistics.total_organizations} label="Rescues" />
            </div>
            <div className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
              Rescues
            </div>
          </div>

          {/* Breeds Count */}
          <div className="text-center">
            <div className="text-2xl font-semibold tracking-tight text-orange-600 dark:text-orange-400">
              {statistics.total_breeds ? (
                <span>{statistics.total_breeds}+</span>
              ) : (
                <span>50+</span>
              )}
            </div>
            <div className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
              Breeds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}