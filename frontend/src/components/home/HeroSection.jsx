// frontend/src/components/home/HeroSection.jsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import AnimatedCounter from "../ui/AnimatedCounter";
import { getStatistics } from "../../services/animalsService";
import { reportError } from "../../utils/logger";

/**
 * Hero section with animated statistics and call-to-action buttons
 * @param {Object} props - Component props
 * @param {Object} props.initialStatistics - Pre-fetched statistics data from SSR
 * @param {boolean} props.priority - Whether this section should load with priority
 */
export default function HeroSection({
  initialStatistics = null,
  priority = false,
}) {
  const [statistics, setStatistics] = useState(initialStatistics);
  const [loading, setLoading] = useState(!initialStatistics);
  const [error, setError] = useState(null);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getStatistics();
      setStatistics(stats);
    } catch (err) {
      reportError("Error fetching statistics", { error: err.message });
      setError("Unable to load statistics. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (!initialStatistics) {
      fetchStatistics();
    }
  }, [initialStatistics]);

  return (
    <section
      data-testid="hero-section"
      className="hero-gradient relative overflow-hidden py-12 md:py-20 lg:py-24"
    >
      <div
        data-testid="hero-container"
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div
          data-testid="hero-content"
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20"
        >
          {/* Left Column - Hero Text and CTA */}
          <div className="flex-1 text-center lg:text-left">
            <h1
              data-testid="hero-title"
              className="text-hero font-bold text-foreground mb-6 leading-tight"
            >
              Helping rescue dogs find loving homes
            </h1>
            <p
              data-testid="hero-subtitle"
              className="text-body text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Browse available dogs from trusted rescue organizations across
              Europe & UK. Every dog deserves a second chance at
              happiness.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/dogs">
                <Button
                  data-testid="hero-primary-cta"
                  size="lg"
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-8 py-3"
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  Find Your New Best Friend
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  data-testid="hero-secondary-cta"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 px-8 py-3"
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  About Our Mission
                </Button>
              </Link>
            </div>

            {/* Quick Browse CTA - Available on all devices */}
            <div className="mt-6">
              <Link href="/swipe">
                <Button
                  data-testid="hero-swipe-cta"
                  size="lg"
                  className="w-full sm:w-auto sm:max-w-xs sm:mx-auto lg:mx-0 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 border-2 border-orange-600 dark:border-orange-500 hover:bg-orange-50 dark:hover:bg-gray-700 font-bold px-8 py-3 transition-colors"
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <span className="mr-2 text-xl" aria-label="Paw icon">
                    🐾
                  </span>
                  Quick Browse Dogs
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - Statistics */}
          <div className="flex-1 w-full max-w-lg">
            {loading && (
              <div data-testid="statistics-loading" className="space-y-6">
                <div
                  data-testid="stat-loading"
                  className="bg-card/50 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-6 animate-shimmer"
                >
                  <div className="h-12 bg-gradient-to-r from-muted to-muted/80 rounded mb-2"></div>
                  <div className="h-4 bg-gradient-to-r from-muted to-muted/80 rounded w-3/4"></div>
                </div>
                <div
                  data-testid="stat-loading"
                  className="bg-card/50 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-6 animate-shimmer"
                >
                  <div className="h-12 bg-gradient-to-r from-muted to-muted/80 rounded mb-2"></div>
                  <div className="h-4 bg-gradient-to-r from-muted to-muted/80 rounded w-3/4"></div>
                </div>
                <div
                  data-testid="stat-loading"
                  className="bg-card/50 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-6 animate-shimmer"
                >
                  <div className="h-12 bg-gradient-to-r from-muted to-muted/80 rounded mb-2"></div>
                  <div className="h-4 bg-gradient-to-r from-muted to-muted/80 rounded w-3/4"></div>
                </div>
              </div>
            )}

            {error && (
              <div
                data-testid="statistics-error"
                className="bg-card/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 text-center"
              >
                <div className="text-muted-foreground mb-4">{error}</div>
                <Button
                  data-testid="retry-button"
                  onClick={fetchStatistics}
                  variant="outline"
                  size="sm"
                >
                  Try again
                </Button>
              </div>
            )}

            {statistics && !loading && !error && (
              <div data-testid="statistics-content" className="space-y-6">
                <div
                  data-testid="statistics-grid"
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                >
                  {/* Dogs Count */}
                  <div className="bg-card/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 text-center shadow-sm dark:shadow-purple-500/10">
                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">
                      <AnimatedCounter
                        value={statistics.total_dogs}
                        label="Dogs need homes"
                        className="block"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Dogs need homes
                    </div>
                  </div>

                  {/* Organizations Count */}
                  <div className="bg-card/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 text-center shadow-sm dark:shadow-purple-500/10">
                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">
                      <AnimatedCounter
                        value={statistics.total_organizations}
                        label="Rescue organizations"
                        className="block"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Rescue organizations
                    </div>
                  </div>

                  {/* Countries Count */}
                  <div className="bg-card/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 text-center shadow-sm dark:shadow-purple-500/10">
                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">
                      <AnimatedCounter
                        value={statistics.countries.length}
                        label="Countries"
                        className="block"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Countries
                    </div>
                  </div>
                </div>

                {/* Organizations Breakdown */}
                <div className="bg-card/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 shadow-sm dark:shadow-purple-500/10">
                  <div className="text-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">
                      Dogs available from these organizations:
                    </div>
                  </div>

                  {statistics.organizations.length > 0 ? (
                    <div className="space-y-2">
                      {statistics.organizations.slice(0, 4).map((org) => (
                        <div
                          key={org.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-foreground truncate flex-1 mr-2">
                            {org.name}
                          </span>
                          <span className="text-orange-600 font-medium">
                            ({org.dog_count})
                          </span>
                        </div>
                      ))}
                      {statistics.organizations.length > 4 && (
                        <div className="text-xs text-muted-foreground text-center pt-2">
                          + {statistics.organizations.length - 4} more
                          organizations
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center">
                      No organizations currently available
                    </div>
                  )}
                </div>

                {/* Screen Reader Description */}
                <div data-testid="statistics-description" className="sr-only">
                  Current statistics about rescue dogs available for adoption:{" "}
                  {statistics.total_dogs} dogs from{" "}
                  {statistics.total_organizations} organizations across{" "}
                  {statistics.countries.length} countries.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}