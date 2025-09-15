"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useParams,
  usePathname,
  useSearchParams,
  useRouter,
} from "next/navigation";
import Link from "next/link";
import Layout from "../../../components/layout/Layout";
import Loading from "../../../components/ui/Loading";
import { Button } from "../../../components/ui/button";
import { getAnimalBySlug } from "../../../services/animalsService";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import ShareButton from "../../../components/ui/ShareButton";
import SocialMediaLinks from "../../../components/ui/SocialMediaLinks";
import { FavoriteButton } from "../../../components/favorites/FavoriteButton";
import {
  getDetailHeroImageWithPosition,
  getThumbnailImage,
  handleImageError,
} from "../../../utils/imageUtils";
import HeroImageWithBlurredBackground from "../../../components/ui/HeroImageWithBlurredBackground";
import OrganizationCard from "../../../components/organizations/OrganizationCard";
import { ToastProvider } from "../../../contexts/ToastContext";
import RelatedDogsSection from "../../../components/dogs/RelatedDogsSection";
import DogDescription from "../../../components/dogs/DogDescription";
import { reportError } from "../../../utils/logger";
import {
  sanitizeText,
  sanitizeHtml,
  safeExternalUrl,
} from "../../../utils/security";
import { getAgeCategory } from "../../../utils/dogHelpers";
import DogDetailSkeleton from "../../../components/ui/DogDetailSkeleton";
import DogDetailErrorBoundary from "../../../components/error/DogDetailErrorBoundary";
import { ScrollAnimationWrapper } from "../../../hooks/useScrollAnimation";
import { DogSchema, BreadcrumbSchema } from "../../../components/seo";
import Breadcrumbs from "../../../components/ui/Breadcrumbs";
import { useSwipeNavigation } from "../../../hooks/useSwipeNavigation";
import {
  trackDogView,
  trackDogImageView,
  trackExternalLinkClick,
} from "@/lib/monitoring/breadcrumbs";
import {
  PersonalityTraits,
  EnergyTrainability,
  CompatibilityIcons,
  ActivitiesQuirks,
  NavigationArrows,
} from "../../../components/dogs/detail";
import DogStatusBadge from "../../../components/dogs/DogStatusBadge";
import AdoptedCelebration from "../../../components/dogs/AdoptedCelebration";

export default function DogDetailClient({ params = {}, initialDog = null }) {
  const urlParams = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dogSlug = params?.slug || urlParams?.slug;
  const [dog, setDog] = useState(initialDog);
  const [loading, setLoading] = useState(!initialDog);
  const [error, setError] = useState(false);
  const [retryInProgress, setRetryInProgress] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true); // Control swipe hint visibility
  const mountedRef = useRef(true); // Track component mount status for cleanup

  // Convert search params to object for swipe navigation
  const searchParamsObj = useMemo(() => {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }, [searchParams]);

  // Swipe navigation setup
  const {
    handlers,
    prevDog,
    nextDog,
    isLoading: navLoading,
  } = useSwipeNavigation({
    currentDogSlug: dogSlug,
    searchParams: searchParamsObj,
  });

  // Enhanced fetchDogData with comprehensive error handling and retry logic
  const fetchDogData = useCallback(
    async (retryCount = 0) => {
      if (!mountedRef.current) return; // Prevent state updates if unmounted

      const fetchStartTime = Date.now();
      const maxRetries = 3;

      let timeoutId;

      try {
        setLoading(true);
        setError(false);

        // Create timeout promise for hanging requests detection
        const timeoutMs = 10000; // 10 second timeout
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`API request timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        // Race between API call and timeout
        const data = await Promise.race([
          getAnimalBySlug(dogSlug),
          timeoutPromise,
        ]);

        // Clear timeout on successful response
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Only update state if component is still mounted
        if (mountedRef.current) {
          setDog(data);

          // Track dog view when successfully loaded
          if (data?.id && data?.name && data?.organization?.slug) {
            try {
              trackDogView(
                data.id.toString(),
                data.name,
                data.organization.slug,
              );
            } catch (error) {
              console.error("Failed to track dog view:", error);
            }
          }
        }
      } catch (err) {
        const errorInfo = {
          message: err.message,
          name: err.name,
          dogSlug,
          retryCount,
          fetchDuration: Date.now() - fetchStartTime,
          isAbortError: err.name === "AbortError",
          isNetworkError: err.message.includes("fetch"),
          timestamp: Date.now(),
        };

        // Always report errors for monitoring
        reportError(err, errorInfo);

        // Retry logic for certain types of errors
        if (
          retryCount < maxRetries &&
          (err.name === "AbortError" || err.message.includes("fetch"))
        ) {
          if (mountedRef.current) {
            setRetryInProgress(true);
          }

          // Exponential backoff delay
          setTimeout(
            () => {
              if (mountedRef.current) {
                setRetryInProgress(false);
                fetchDogData(retryCount + 1);
              }
            },
            1000 * (retryCount + 1),
          );
          return; // Don't set error state yet, we're retrying
        }

        if (mountedRef.current) {
          setError(true);
        }
      } finally {
        // Clear timeout in finally block to prevent memory leaks
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (mountedRef.current && retryCount === 0 && !retryInProgress) {
          // Only set loading to false on the original call when no retry is pending
          setLoading(false);
        }
      }
    },
    [dogSlug],
  );

  useEffect(() => {
    // If we have initialDog from server-side, use it
    if (initialDog) {
      setDog(initialDog);
      setLoading(false);
      setError(false);

      // Track dog view for SSR data
      if (
        initialDog?.id &&
        initialDog?.name &&
        initialDog?.organization?.slug
      ) {
        try {
          trackDogView(
            initialDog.id.toString(),
            initialDog.name,
            initialDog.organization.slug,
          );
        } catch (error) {
          console.error("Failed to track dog view:", error);
        }
      }
      return;
    }

    // Otherwise fetch client-side
    // Reset loading state for new navigation
    setLoading(true);
    setError(false);
    setDog(null);

    // Check if document is ready before making API call
    const makeApiCall = () => {
      if (document.readyState === "complete") {
        fetchDogData();
      } else {
        const handleLoad = () => {
          fetchDogData();
          window.removeEventListener("load", handleLoad);
        };

        window.addEventListener("load", handleLoad);

        // Fallback timeout in case load event doesn't fire
        const fallbackTimeout = setTimeout(() => {
          fetchDogData();
          window.removeEventListener("load", handleLoad);
        }, 2000);

        return () => {
          window.removeEventListener("load", handleLoad);
          clearTimeout(fallbackTimeout);
        };
      }
    };

    makeApiCall();

    // Cleanup function to prevent memory leaks
    return () => {
      mountedRef.current = false;
    };
  }, [dogSlug, initialDog]); // Include initialDog in dependencies

  // Cleanup on unmount
  useEffect(() => {
    // Set mounted to true on mount
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle swipe hint visibility timing
  useEffect(() => {
    if (showSwipeHint && (prevDog || nextDog)) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 3500); // Hide after 3.5 seconds

      return () => clearTimeout(timer);
    }
  }, [showSwipeHint, prevDog, nextDog]);

  // Reset swipe hint visibility when navigating to a new dog
  useEffect(() => {
    setShowSwipeHint(true);
  }, [dogSlug]);

  const formatAge = (dog) => {
    // Use getAgeCategory to display age groups
    const ageCategory = getAgeCategory({
      age_min_months: dog.age_min_months,
      age_max_months: dog.age_max_months,
      age_text: dog.age_text,
    });

    return ageCategory || null;
  };

  // Memoized retry handler
  const handleRetry = useCallback(() => {
    fetchDogData();
  }, [fetchDogData]);

  // Navigation handlers for arrow navigation - use router for better performance
  const router = useRouter();

  const handlePrevDog = useCallback(() => {
    if (prevDog) {
      const url = `/dogs/${prevDog.slug}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      router.push(url);
    }
  }, [prevDog, searchParams, router]);

  const handleNextDog = useCallback(() => {
    if (nextDog) {
      const url = `/dogs/${nextDog.slug}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      router.push(url);
    }
  }, [nextDog, searchParams, router]);

  if (loading) {
    return (
      <Layout>
        <DogDetailSkeleton />
      </Layout>
    );
  }

  if (error || !dog) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <Alert variant="destructive">
            <AlertTitle className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Dog Not Found
            </AlertTitle>
            <AlertDescription>
              <p className="mb-4">
                Sorry, we couldn't find the dog you're looking for.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="flex items-center px-4 py-2 transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Try Again
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <Link href="/dogs" className="px-4 py-2">
                    Return to dogs listing
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Find Dogs", url: "/dogs" },
    { name: dog.name },
  ];

  return (
    <ToastProvider>
      <DogDetailErrorBoundary dogSlug={dogSlug}>
        {/* SEO: Schema.org structured data for search engines */}
        <DogSchema dog={dog} />
        <BreadcrumbSchema items={breadcrumbItems} />
        <Layout>
          <div
            data-testid="dog-detail-container"
            className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          >
            {/* Breadcrumb Navigation using reusable component */}
            <div>
              <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div>
              <Link href="/dogs">
                <Button
                  variant="link"
                  className="inline-flex items-center text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 mb-6 p-2 h-auto transition-all duration-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  data-testid="back-button"
                >
                  ← Back to all dogs
                </Button>
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden">
              {/* Apply swipe handlers to the entire content area */}
              <div className="p-4 sm:p-6" {...handlers}>
                {/* Unified Single Column Responsive Layout */}
                <div className="flex flex-col gap-8">
                  {/* Hero Image Section - Full Width */}
                  <div>
                    <div className="w-full relative" data-testid="hero-section">
                      {/* Swipe hint for mobile only - fades out after 3.5 seconds */}
                      <div className="lg:hidden">
                        {(prevDog || nextDog) && (
                          <div
                            className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-10 transition-opacity duration-500 ${
                              showSwipeHint
                                ? "opacity-100"
                                : "opacity-0 pointer-events-none"
                            }`}
                            role="status"
                            aria-live="polite"
                            aria-label="Swipe navigation hint"
                          >
                            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                              {prevDog && <span aria-hidden="true">←</span>}
                              <span>Swipe to browse</span>
                              {nextDog && <span aria-hidden="true">→</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {(() => {
                        // Development logging only (disabled in tests to prevent noise)
                        if (
                          process.env.NODE_ENV === "development" &&
                          typeof jest === "undefined"
                        ) {
                          console.log(
                            "[DogDetail] Navigation: rendering hero section",
                            {
                              pathname,
                              dogSlug,
                              hasDog: !!dog,
                              hasImageUrl: !!dog?.primary_image_url,
                              imageUrl: dog?.primary_image_url,
                              timestamp: Date.now(),
                            },
                          );
                        }

                        if (!dog || !dog.primary_image_url) {
                          return (
                            <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-gray-500">
                                  Loading image...
                                </p>
                              </div>
                            </div>
                          );
                        }

                        // DIAGNOSTIC: Log image URL being passed to component (disabled in tests to prevent noise)
                        if (
                          process.env.NODE_ENV === "development" &&
                          typeof jest === "undefined"
                        ) {
                          console.log(
                            "[DogDetailClient] About to render HeroImageWithBlurredBackground:",
                            {
                              dogSlug: dog.slug,
                              dogName: dog.name,
                              imageUrl: dog.primary_image_url,
                              timestamp: Date.now(),
                            },
                          );
                        }

                        return (
                          <HeroImageWithBlurredBackground
                            key={`hero-${dogSlug}-${dog.id}`}
                            src={dog.primary_image_url}
                            alt={`${sanitizeText(dog.name)} - Hero Image`}
                            className="mb-6 shadow-xl"
                            onClick={() => {
                              // Track image view when hero image is clicked
                              if (dog?.id) {
                                try {
                                  trackDogImageView(dog.id.toString(), 0, 1);
                                } catch (error) {
                                  console.error(
                                    "Failed to track dog image view:",
                                    error,
                                  );
                                }
                              }
                            }}
                            onError={() => {
                              reportError(
                                new Error("Hero image failed to load"),
                                {
                                  dogSlug: dog.slug,
                                  imageUrl: dog.primary_image_url,
                                },
                              );
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Show AdoptedCelebration banner for adopted dogs - moved below image */}
                  {dog.status === "adopted" && (
                    <AdoptedCelebration dogName={dog.name} />
                  )}

                  {/* Content Section - Below Hero */}
                  <div className="w-full">
                    {/* Enhanced Header with better integrated action buttons */}
                    <header>
                      <div className="mb-6">
                        {/* Title and action buttons in one visual group */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">
                                {sanitizeText(dog.name)}
                              </h1>
                              {dog.status && (
                                <DogStatusBadge status={dog.status} />
                              )}
                            </div>
                          </div>

                          {/* Action bar with enhanced styling */}
                          <div
                            className="flex items-center space-x-3 sm:ml-6"
                            data-testid="action-bar"
                          >
                            {/* Favorite Button */}
                            <div className="flex items-center">
                              <FavoriteButton
                                dogId={dog.id}
                                dogName={dog.name}
                                orgSlug={dog.organization?.slug}
                                className="p-3 rounded-full hover:bg-gray-100 transition-all duration-200 hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                              />
                            </div>

                            {/* Share Button with enhanced styling */}
                            <div className="flex items-center">
                              <ShareButton
                                url={
                                  typeof window !== "undefined"
                                    ? window.location.href
                                    : ""
                                }
                                title={`Meet ${dog.name} - Available for Adoption`}
                                text={`${dog.name} is a ${dog.primary_breed || dog.standardized_breed || dog.breed || "lovely dog"} looking for a forever home.`}
                                variant="ghost"
                                size="sm"
                                className="p-3 rounded-full hover:bg-gray-100 transition-all duration-200 hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tagline with better spacing - use LLM tagline if available */}
                        <div className="">
                          <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                            {dog.llm_tagline || "Looking for a loving home"}
                          </p>
                        </div>
                      </div>
                    </header>

                    {/* Only show breed section if we have a known breed */}
                    {(() => {
                      const breed =
                        dog.primary_breed ||
                        dog.standardized_breed ||
                        dog.breed;
                      const isUnknownBreed =
                        !breed ||
                        breed === "Unknown" ||
                        breed.toLowerCase() === "unknown";

                      if (isUnknownBreed) {
                        return null; // Hide the entire breed section for unknown breeds
                      }

                      return (
                        <div>
                          <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                              Breed
                            </h2>
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-base leading-relaxed text-gray-800 dark:text-gray-100">
                                {sanitizeText(breed)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quick Info Cards */}
                    <section aria-label="Dog Information Summary">
                      <div
                        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8"
                        data-testid="metadata-cards"
                      >
                        {/* Age Card - Always show, display "Age Unknown" if no age data */}
                        <div
                          className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md border border-purple-100 dark:border-purple-800/30"
                          data-testid="dog-age-card"
                        >
                          <div className="text-3xl mb-2">🎂</div>
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                            Age
                          </p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {formatAge(dog) || "Age Unknown"}
                          </p>
                        </div>

                        {/* Sex Card - Always show, display sex or "Unknown" */}
                        <div
                          className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md border border-orange-100 dark:border-orange-800/30"
                          data-testid="dog-sex-card"
                        >
                          <div className="text-3xl mb-2">
                            {dog.sex && dog.sex.toLowerCase() === "male"
                              ? "♂️"
                              : dog.sex && dog.sex.toLowerCase() === "female"
                                ? "♀️"
                                : "❓"}
                          </div>
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
                            Gender
                          </p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {dog.sex && dog.sex.toLowerCase() !== "unknown"
                              ? dog.sex
                              : "Unknown"}
                          </p>
                        </div>

                        {/* Breed Card - Only show if breed is known and not "Unknown" */}
                        {(dog.primary_breed ||
                          dog.standardized_breed ||
                          dog.breed) &&
                          !(
                            dog.primary_breed === "Unknown" ||
                            dog.standardized_breed === "Unknown" ||
                            dog.breed === "Unknown" ||
                            dog.primary_breed?.toLowerCase() === "unknown" ||
                            dog.standardized_breed?.toLowerCase() ===
                              "unknown" ||
                            dog.breed?.toLowerCase() === "unknown"
                          ) && (
                            <div
                              className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md border border-green-100 dark:border-green-800/30"
                              data-testid="dog-breed-card"
                            >
                              <div className="text-3xl mb-2">🐕</div>
                              <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                                Breed
                              </p>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {dog.primary_breed ||
                                  dog.standardized_breed ||
                                  dog.breed}
                              </p>
                            </div>
                          )}

                        {/* Size Card - Only show if size data exists */}
                        {(dog.standardized_size || dog.size) && (
                          <div
                            className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md border border-orange-100 dark:border-orange-800/30"
                            data-testid="dog-size-card"
                          >
                            <div className="text-3xl mb-2">📏</div>
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
                              Size
                            </p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {dog.standardized_size || dog.size}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Enhanced About Section with New Description Component */}
                    <section aria-label="About the Dog">
                      <div className="mb-8" data-testid="about-section">
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                          About {sanitizeText(dog.name)}
                        </h2>

                        <DogDescription
                          description={
                            dog?.llm_description ||
                            dog?.properties?.description ||
                            dog?.properties?.raw_description ||
                            ""
                          }
                          dogName={dog.name}
                          organizationName={dog.organization?.name}
                          className="mt-0"
                        />
                      </div>
                    </section>

                    {/* LLM Components Section */}
                    {dog.dog_profiler_data && (
                      <ScrollAnimationWrapper delay={750}>
                        <section
                          aria-label="Personality and Behavioral Information"
                          className="mb-8 space-y-6"
                        >
                          {/* Personality Traits */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                              Personality
                            </h3>
                            <PersonalityTraits
                              profilerData={dog.dog_profiler_data}
                            />
                          </div>

                          {/* Energy & Trainability */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                              Energy & Training
                            </h3>
                            <EnergyTrainability
                              profilerData={dog.dog_profiler_data}
                            />
                          </div>

                          {/* Compatibility Icons */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                              Good With
                            </h3>
                            <CompatibilityIcons
                              profilerData={dog.dog_profiler_data}
                            />
                          </div>

                          {/* Activities & Quirks */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                              Activities & Quirks
                            </h3>
                            <ActivitiesQuirks
                              profilerData={dog.dog_profiler_data}
                            />
                          </div>
                        </section>
                      </ScrollAnimationWrapper>
                    )}

                    {/* CTA Section */}
                    {dog.status === "available" && (
                      <ScrollAnimationWrapper delay={850}>
                        <div className="mb-8" data-testid="cta-section">
                          <div className="flex justify-center">
                            {(() => {
                              const safeUrl = safeExternalUrl(dog.adoption_url);
                              if (!safeUrl) {
                                return (
                                  <div className="text-center text-gray-500 dark:text-gray-400">
                                    <p>Adoption URL not available</p>
                                  </div>
                                );
                              }

                              return (
                                <Button
                                  asChild
                                  className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-[400px] bg-orange-600 dark:bg-orange-600 hover:bg-orange-700 dark:hover:bg-orange-700 text-white text-lg py-4 px-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg transform hover:scale-105 focus:ring-4 focus:ring-orange-500 focus:ring-offset-2"
                                >
                                  <a
                                    href={safeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center"
                                    data-testid="adopt-button"
                                    aria-label={`Start adoption process for ${dog.name}`}
                                    onClick={() => {
                                      // Track external link click
                                      if (dog?.organization?.slug && dog?.id) {
                                        try {
                                          trackExternalLinkClick(
                                            "adopt",
                                            dog.organization.slug,
                                            dog.id.toString(),
                                          );
                                        } catch (error) {
                                          console.error(
                                            "Failed to track external link click:",
                                            error,
                                          );
                                        }
                                      }
                                    }}
                                  >
                                    <svg
                                      className="w-5 h-5 mr-3 transition-transform duration-200"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    Start Adoption Process
                                  </a>
                                </Button>
                              );
                            })()}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3 transition-colors duration-200">
                            You'll be redirected to the rescue organization's
                            website
                          </p>
                        </div>
                      </ScrollAnimationWrapper>
                    )}

                    {/* Organization Section with Loading State */}
                    <ScrollAnimationWrapper delay={950}>
                      <div
                        className="mb-8"
                        data-testid="organization-container"
                      >
                        {dog.organization ? (
                          <OrganizationCard
                            organization={dog.organization}
                            size="medium"
                          />
                        ) : (
                          <div className="border rounded-lg p-6 bg-gray-50 animate-pulse">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-3">
                                  <div className="w-9 h-9 bg-gray-200 rounded-lg mr-3"></div>
                                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                                </div>
                                <div className="w-48 h-8 bg-gray-200 rounded mb-4"></div>
                                <div className="w-40 h-10 bg-gray-200 rounded-lg"></div>
                              </div>
                              <div className="ml-6">
                                <div className="w-24 h-8 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollAnimationWrapper>

                    {/* Related Dogs Section with Lazy Loading */}
                    {dog.organization_id && (
                      <ScrollAnimationWrapper delay={1050} threshold={0.1}>
                        <div data-testid="related-dogs-section">
                          <RelatedDogsSection
                            organizationId={dog.organization_id}
                            currentDogId={dog.id}
                            organization={dog.organization}
                          />
                        </div>
                      </ScrollAnimationWrapper>
                    )}
                  </div>
                </div>

                {/* Navigation Arrows for Desktop */}
                <NavigationArrows
                  onPrev={handlePrevDog}
                  onNext={handleNextDog}
                  hasPrev={!!prevDog}
                  hasNext={!!nextDog}
                  isLoading={navLoading}
                />
              </div>
            </div>
          </div>
        </Layout>
      </DogDetailErrorBoundary>
    </ToastProvider>
  );
}
